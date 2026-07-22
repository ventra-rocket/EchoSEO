import { env } from "cloudflare:workers";
import {
  getContactNameParts,
  updateLoopsContact,
} from "@/server/email/loops-client";

const LOOPS_TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional";

function getOptionalEnv(name: string) {
  const value: unknown = Reflect.get(env, name);
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed || null;
}

function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`${name} is required in hosted mode`);
  }

  return value;
}

function getHostedAuthEmailConfig() {
  return {
    apiKey: getRequiredEnv("LOOPS_API_KEY"),
    verificationTemplateId: getRequiredEnv(
      "LOOPS_TRANSACTIONAL_VERIFY_EMAIL_ID",
    ),
    passwordResetTemplateId: getRequiredEnv(
      "LOOPS_TRANSACTIONAL_RESET_PASSWORD_ID",
    ),
  };
}

async function sendLoopsTransactionalEmail({
  apiKey,
  email,
  transactionalId,
  dataVariables,
}: {
  apiKey: string;
  email: string;
  transactionalId: string;
  dataVariables: Record<string, string>;
}) {
  const response = await fetch(LOOPS_TRANSACTIONAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      transactionalId,
      email,
      addToAudience: false,
      dataVariables,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorPayload = await response.json().catch(() => null);
  console.error("Loops transactional email error:", {
    status: response.status,
    email,
    transactionalId,
    errorPayload,
  });

  throw new Error(
    `Failed to send Loops transactional email (${response.status})`,
  );
}

export async function upsertHostedSignupContact({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const apiKey = getOptionalEnv("LOOPS_API_KEY");

  if (!apiKey) {
    console.warn(
      "Skipping Loops signup contact sync: LOOPS_API_KEY is not set",
    );
    return;
  }

  await updateLoopsContact({
    apiKey,
    payload: {
      email,
      userId,
      source: "openseo-signup",
      userGroup: "app-user",
      ...getContactNameParts(name),
    },
    logContext: { action: "signup-contact-sync" },
  });
}

export async function sendHostedVerificationEmail({
  email,
  confirmationUrl,
}: {
  email: string;
  confirmationUrl: string;
}) {
  const config = getHostedAuthEmailConfig();
  await sendLoopsTransactionalEmail({
    apiKey: config.apiKey,
    email,
    transactionalId: config.verificationTemplateId,
    dataVariables: {
      appName: "EchoSEO",
      confirmationUrl,
    },
  });
}

/**
 * Emails a workspace invitation. Unlike verification/reset, this must never throw:
 * an invitation row is written by Better Auth before this runs, so a missing
 * template or a Loops outage should not fail the invite — the inviter can resend.
 * If the optional invite template is not configured, it logs and skips.
 */
export async function sendHostedInvitationEmail({
  email,
  inviterName,
  organizationName,
  acceptUrl,
}: {
  email: string;
  inviterName: string;
  organizationName: string;
  acceptUrl: string;
}) {
  const apiKey = getOptionalEnv("LOOPS_API_KEY");
  const transactionalId = getOptionalEnv("LOOPS_TRANSACTIONAL_INVITE_ID");

  if (!apiKey || !transactionalId) {
    console.warn(
      "Skipping workspace invitation email: LOOPS_API_KEY or LOOPS_TRANSACTIONAL_INVITE_ID is not set",
    );
    return;
  }

  try {
    await sendLoopsTransactionalEmail({
      apiKey,
      email,
      transactionalId,
      dataVariables: {
        appName: "EchoSEO",
        inviterName,
        organizationName,
        acceptUrl,
      },
    });
  } catch (error) {
    // A Loops outage must not fail invite-member: the invitation row is already
    // written and the inviter can resend. Swallow after logging.
    console.error("Failed to send workspace invitation email", error);
  }
}

export async function sendHostedPasswordResetEmail({
  email,
  resetUrl,
}: {
  email: string;
  resetUrl: string;
}) {
  const config = getHostedAuthEmailConfig();
  await sendLoopsTransactionalEmail({
    apiKey: config.apiKey,
    email,
    transactionalId: config.passwordResetTemplateId,
    dataVariables: {
      appName: "EchoSEO",
      resetUrl,
    },
  });
}
