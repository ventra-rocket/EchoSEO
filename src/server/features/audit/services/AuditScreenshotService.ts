/**
 * Capturing, reading and authorizing audit evidence screenshots.
 *
 * A capture is a full-page render of one crawled page, fetched on demand from
 * Google PageSpeed Insights (the same free source the anonymous checker uses)
 * and stored in private R2. It is corroborating evidence, not a crawl fact, so a
 * PSI miss records a `failed` row rather than throwing.
 *
 * Trust boundaries:
 * - Capturing is a mutation gated on the investigate role, and the target URL
 *   must already exist in this audit's crawled HTML pages — that membership
 *   check, not a URL allowlist, is what stops the endpoint being driven to
 *   render an arbitrary or external URL.
 * - Reading a stored capture's state carries only project membership.
 * - `resolveView` is the serve endpoint's org-scope check; the R2 key never
 *   leaves the server.
 *
 * PSI quota: captures draw the same free `GOOGLE_PSI_API_KEY` quota the anonymous
 * checker uses, and this authenticated path deliberately carries no global daily
 * ceiling — an investigate-role caller, the per-(audit,url) cache and the failure
 * cooldown are the accepted bound. If a workspace is ever seen to starve the
 * shared quota, add a per-organization ceiling here rather than reworking the
 * flow.
 */
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import { fetchPageSpeed, extractScreenshot } from "@/server/lib/psi/pagespeed";
import type { AuthMode } from "@/lib/auth-mode";
import { AppError } from "@/server/lib/errors";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditScreenshotRepository } from "@/server/features/audit/repositories/AuditScreenshotRepository";
import {
  auditScreenshotKey,
  putAuditScreenshot,
} from "@/server/features/audit/evidence/audit-screenshot-store";
import {
  canInvestigate,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";

/** PSI usually answers within ~15s; cut a hung call so it cannot pin the request. */
const PSI_TIMEOUT_MS = 20_000;

/** A page PSI just failed to render is not re-attempted until this elapses, so a
 * repeatedly-broken URL cannot be made to hammer the shared PSI quota on click. */
const FAILURE_COOLDOWN_MS = 60 * 60 * 1000;

/** A full-page capture runs to a few hundred KB; anything past this is refused
 * rather than stored, bounding a single object's size. */
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;

type EvidenceState =
  | { status: "ready"; screenshotId: string; capturedAt: string }
  | { status: "failed" }
  | { status: "capturable" }
  | { status: "unavailable" };

interface CaptureInput {
  projectId: string;
  auditId: string;
  url: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
}

interface ReadInput {
  projectId: string;
  auditId: string;
  url: string;
}

/** Read the stored capture state for a (audit, url). No PSI, no writes. */
async function getEvidenceState(input: ReadInput): Promise<EvidenceState> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const existing = await AuditScreenshotRepository.findByAuditUrl(
    input.auditId,
    input.url,
  );
  if (existing?.status === "ready") {
    return {
      status: "ready",
      screenshotId: existing.id,
      capturedAt: existing.capturedAt,
    };
  }
  if (existing?.status === "failed") return { status: "failed" };

  // No capture yet — is this URL even eligible? Only a crawled HTML page of this
  // audit can be captured, so tell the reader which of the two it is honestly.
  const page = await AuditScreenshotRepository.findHtmlPageByUrl(
    input.auditId,
    input.url,
  );
  return page ? { status: "capturable" } : { status: "unavailable" };
}

/** Capture (or return a cached) evidence screenshot. Mutation: investigate role. */
async function captureEvidence(input: CaptureInput): Promise<EvidenceState> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot capture evidence in this workspace",
    );
  }

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  // Membership / SSRF gate: the URL must be a crawled HTML page of this audit.
  const page = await AuditScreenshotRepository.findHtmlPageByUrl(
    input.auditId,
    input.url,
  );
  if (!page) throw new AppError("NOT_FOUND");

  const existing = await AuditScreenshotRepository.findByAuditUrl(
    input.auditId,
    input.url,
  );
  if (existing?.status === "ready") {
    return {
      status: "ready",
      screenshotId: existing.id,
      capturedAt: existing.capturedAt,
    };
  }
  if (
    existing?.status === "failed" &&
    Date.now() - Date.parse(existing.capturedAt) < FAILURE_COOLDOWN_MS
  ) {
    return { status: "failed" };
  }

  const id = existing?.id ?? crypto.randomUUID();
  const capturedAt = new Date().toISOString();
  const shot = await renderScreenshot(input.url);

  const base = {
    id,
    auditId: input.auditId,
    projectId: input.projectId,
    organizationId: input.organizationId,
    url: input.url,
    pageId: page.id,
    capturedAt,
  };

  if (!shot || shot.bytes.byteLength > MAX_SCREENSHOT_BYTES) {
    await AuditScreenshotRepository.upsert({
      ...base,
      status: "failed",
      r2Key: null,
      contentType: null,
      width: null,
      height: null,
    });
    return { status: "failed" };
  }

  // Key by URL digest, not the row id: a concurrent first capture writes the same
  // object instead of stranding one under an id no surviving row references.
  const key = auditScreenshotKey(input.auditId, await urlDigest(input.url));
  // R2 before the D1 `ready` commit, so a `ready` row never points at a missing
  // object.
  await putAuditScreenshot(key, shot.bytes, shot.contentType);
  await AuditScreenshotRepository.upsert({
    ...base,
    status: "ready",
    r2Key: key,
    contentType: shot.contentType,
    width: shot.width,
    height: shot.height,
  });

  // Return the persisted row's identity, not the local `id`: a concurrent racer's
  // upsert keeps the winning row's id, so echoing the local id would hand back a
  // screenshotId that `resolveView` cannot find.
  const saved = await AuditScreenshotRepository.findByAuditUrl(
    input.auditId,
    input.url,
  );
  return saved?.status === "ready"
    ? { status: "ready", screenshotId: saved.id, capturedAt: saved.capturedAt }
    : { status: "failed" };
}

interface ResolvedView {
  r2Key: string;
  contentType: string;
}

/**
 * The serve endpoint's authorization + state check. Returns the R2 key only when
 * the caller's organization owns the capture and it is ready; every other case
 * returns null so the route answers 404 without disclosing why.
 */
async function resolveView(input: {
  organizationId: string;
  screenshotId: string;
}): Promise<ResolvedView | null> {
  const row = await AuditScreenshotRepository.findById(input.screenshotId);
  if (
    !row ||
    row.organizationId !== input.organizationId ||
    row.status !== "ready" ||
    !row.r2Key
  ) {
    return null;
  }
  return { r2Key: row.r2Key, contentType: row.contentType ?? "image/webp" };
}

async function renderScreenshot(url: string) {
  try {
    // Inside the try so a self-host without the key records a `failed` row (and
    // its cooldown) like any other PSI miss, instead of throwing a 500 that
    // leaves the capture button live and perpetually broken.
    const apiKey = await getRequiredEnvValue("GOOGLE_PSI_API_KEY");
    const raw = await fetchPageSpeed(
      url,
      apiKey,
      // Desktop, not mobile: a wide capture reads as the real page rather than a
      // phone strip.
      "desktop",
      AbortSignal.timeout(PSI_TIMEOUT_MS),
    );
    return extractScreenshot(raw);
  } catch (error) {
    console.error(`audit-screenshot: PSI render failed for ${url}`, error);
    return null;
  }
}

/** SHA-256 hex of a URL — the stable R2 key suffix for its capture. */
async function urlDigest(url: string): Promise<string> {
  const bytes = new TextEncoder().encode(url);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AuditScreenshotService = {
  getEvidenceState,
  captureEvidence,
  resolveView,
} as const;
