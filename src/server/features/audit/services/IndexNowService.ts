/**
 * IndexNow submission for a professional audit target. IndexNow notifies
 * participating engines (Bing, Yandex, Seznam, Naver, …) — NOT Google — that URLs
 * changed; a receipt is acceptance, never an indexing guarantee.
 *
 * Every entry point is owner/admin only (`canManageTarget`) and scoped to the
 * caller's project. Submission is refused unless the target's key file is live at
 * the host, so this can never be a confused-deputy submitting for a host the
 * caller does not control. The IndexNow key is host-submission proof, not a
 * secret, and is deliberately never Google-facing authority.
 */
import type { AuthMode } from "@/lib/auth-mode";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import { AuditActionRepository } from "@/server/features/audit/repositories/AuditActionRepository";
import {
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import {
  INDEXNOW_ENDPOINT,
  buildIndexNowPayload,
  generateIndexNowKey,
  keyFileMatches,
  keyLocationFor,
  selectSubmittableUrls,
} from "@/server/features/audit/indexnow/indexnow";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { AppError } from "@/server/lib/errors";

interface ManageInput {
  projectId: string;
  auditId: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}

/**
 * Authorize an owner/admin caller and resolve the audit's target. The target is
 * auto-created at audit launch, so a completed audit always has one.
 */
async function resolveManagedTarget(input: ManageInput) {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canManageTarget(role)) {
    throw new AppError(
      "FORBIDDEN",
      "Only workspace owners and admins can manage indexing actions",
    );
  }

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const origin = getOrigin(audit.startUrl);
  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    origin,
  );
  if (!target) throw new AppError("NOT_FOUND");

  return { audit, target, origin, host: new URL(origin).hostname };
}

/** Fetch the key file at its exact location; null when unreachable/blocked. */
async function fetchKeyFileBody(keyLocation: string): Promise<string | null> {
  let safeUrl: string;
  try {
    // Runs the same SSRF guard as the crawler (scheme + private/loopback/metadata
    // + DoH), because the host is customer-controlled.
    safeUrl = await normalizeAndValidateStartUrl(keyLocation);
  } catch {
    return null;
  }
  try {
    const response = await fetch(safeUrl, {
      // The key must live at this exact URL; a redirect elsewhere does not verify.
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    // A valid key file is ≤128 chars; refuse a host that declares or streams
    // something large so a hostile/misconfigured origin cannot pour data into
    // worker memory within the timeout.
    const declaredBytes = Number(response.headers.get("content-length") ?? "0");
    if (declaredBytes > 4_096) return null;
    const body = await response.text();
    return body.length > 4_096 ? null : body;
  } catch {
    return null;
  }
}

async function isKeyFileLive(origin: string, key: string): Promise<boolean> {
  const body = await fetchKeyFileBody(keyLocationFor(origin, key));
  return body !== null && keyFileMatches(body, key);
}

async function getStatus(input: ManageInput) {
  const { target, origin, host } = await resolveManagedTarget(input);
  const key = target.indexnowKey;
  const pages = await AuditRepository.getPageFactsForAudit(input.auditId);

  return {
    host,
    key,
    keyLocation: key ? keyLocationFor(origin, key) : null,
    submittableCount: selectSubmittableUrls(pages, host).length,
    recentActions: await AuditActionRepository.listRecentForTarget(target.id),
  };
}

async function setupKey(input: ManageInput) {
  const { target, origin } = await resolveManagedTarget(input);
  if (target.indexnowKey) {
    return {
      key: target.indexnowKey,
      keyLocation: keyLocationFor(origin, target.indexnowKey),
    };
  }

  // The write is `IS NULL`-guarded, so on a concurrent set-up the loser's key is
  // dropped; re-read to return whichever key actually landed, never a key we
  // believe is stored but isn't.
  await AuditTargetRepository.setIndexNowKey(target.id, generateIndexNowKey());
  const refreshed = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    origin,
  );
  const key = refreshed?.indexnowKey;
  if (!key) {
    throw new AppError("INTERNAL_ERROR", "Failed to store the IndexNow key");
  }
  return { key, keyLocation: keyLocationFor(origin, key) };
}

async function verifyKey(input: ManageInput) {
  const { target, origin } = await resolveManagedTarget(input);
  if (!target.indexnowKey) return { verified: false };
  return { verified: await isKeyFileLive(origin, target.indexnowKey) };
}

type SubmitResult =
  | { outcome: "not_verified" }
  | {
      outcome: "submitted";
      status: "succeeded" | "failed";
      submittedCount: number;
      httpStatus: number | null;
    };

async function submit(input: ManageInput): Promise<SubmitResult> {
  const { target, origin, host } = await resolveManagedTarget(input);
  const key = target.indexnowKey;
  if (!key) {
    // Unreachable from the UI (the submit control only shows once a key exists);
    // a defensive guard for a direct call.
    throw new AppError("VALIDATION_ERROR", "Set up IndexNow before submitting");
  }
  // The key file not being live is an expected, recoverable state the user must
  // act on (host the file), so it is a structured result — not a thrown error
  // whose message the client transport would strip to a bare code.
  if (!(await isKeyFileLive(origin, key))) {
    return { outcome: "not_verified" };
  }

  const pages = await AuditRepository.getPageFactsForAudit(input.auditId);
  const urls = selectSubmittableUrls(pages, host);
  if (urls.length === 0) {
    return {
      outcome: "submitted",
      status: "succeeded",
      submittedCount: 0,
      httpStatus: null,
    };
  }

  const payload = buildIndexNowPayload({
    host,
    key,
    keyLocation: keyLocationFor(origin, key),
    urls,
  });

  let httpStatus: number | null = null;
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    httpStatus = response.status;
  } catch {
    httpStatus = null;
  }

  // IndexNow returns 200 (received) or 202 (received, key validation pending).
  const succeeded = httpStatus === 200 || httpStatus === 202;

  await AuditActionRepository.recordAction({
    projectId: input.projectId,
    organizationId: input.organizationId,
    targetId: target.id,
    auditId: input.auditId,
    actorUserId: input.actorUserId,
    type: "indexnow_submit",
    provider: "indexnow",
    status: succeeded ? "succeeded" : "failed",
    submittedCount: urls.length,
    detail: { host, endpoint: INDEXNOW_ENDPOINT, httpStatus },
  });

  return {
    outcome: "submitted",
    status: succeeded ? "succeeded" : "failed",
    submittedCount: urls.length,
    httpStatus,
  };
}

export const IndexNowService = {
  getStatus,
  setupKey,
  verifyKey,
  submit,
} as const;
