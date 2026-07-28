import { env } from "cloudflare:workers";
import {
  getContactNameParts,
  updateLoopsContact,
} from "@/server/email/loops-client";
import { sendViaResend } from "@/server/services/seo-check/email/resend-client";

function getOptionalEnv(name: string) {
  const value: unknown = Reflect.get(env, name);
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed || null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
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
    apiKey: getRequiredEnv("RESEND_API_KEY"),
    from: getRequiredEnv("AUTH_EMAIL_FROM"),
  };
}

async function getIdempotencyKey(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return `echoseo-auth-${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

async function sendHostedAuthEmail({
  email,
  subject,
  text,
  html,
  idempotencyContext,
}: {
  email: string;
  subject: string;
  text: string;
  html: string;
  idempotencyContext: string;
}) {
  const { apiKey, from } = getHostedAuthEmailConfig();
  await sendViaResend({
    apiKey,
    from,
    to: email,
    subject,
    text,
    html,
    idempotencyKey: await getIdempotencyKey(idempotencyContext),
  });
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
  const safeConfirmationUrl = escapeHtml(confirmationUrl);

  await sendHostedAuthEmail({
    email,
    subject: "Verify your EchoSEO account",
    text: `Verify your EchoSEO account: ${confirmationUrl}`,
    html: `<p>Verify your EchoSEO account.</p><p><a href="${safeConfirmationUrl}">Verify email</a></p>`,
    idempotencyContext: `verify:${email}:${confirmationUrl}`,
  });
}

/**
 * Emails a workspace invitation. Unlike verification/reset, this must never throw:
 * an invitation row is written by Better Auth before this runs, so a mail
 * outage should not fail the invite — the inviter can resend.
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
  try {
    const safeInviterName = escapeHtml(inviterName);
    const safeOrganizationName = escapeHtml(organizationName);
    const safeAcceptUrl = escapeHtml(acceptUrl);
    await sendHostedAuthEmail({
      email,
      subject: `${inviterName} invited you to ${organizationName} on EchoSEO`,
      text: `${inviterName} invited you to join ${organizationName} on EchoSEO: ${acceptUrl}`,
      html: `<p>${safeInviterName} invited you to join ${safeOrganizationName} on EchoSEO.</p><p><a href="${safeAcceptUrl}">Accept invitation</a></p>`,
      idempotencyContext: `invite:${email}:${acceptUrl}`,
    });
  } catch (error) {
    // A mail outage must not fail invite-member: the invitation row is already
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
  const safeResetUrl = escapeHtml(resetUrl);

  await sendHostedAuthEmail({
    email,
    subject: "Reset your EchoSEO password",
    text: `Reset your EchoSEO password: ${resetUrl}`,
    html: `<p>Reset your EchoSEO password.</p><p><a href="${safeResetUrl}">Reset password</a></p>`,
    idempotencyContext: `reset:${email}:${resetUrl}`,
  });
}
