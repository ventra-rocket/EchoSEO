import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { FREE_SEO_CHECK_DEEP_START_PATH } from "@/shared/free-seo-check";
import { TurnstileWidget } from "./TurnstileWidget";
import { DeepTierPitch } from "./DeepTierPitch";

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR:
    "Use a real email address — disposable inboxes aren't accepted.",
  CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
  FORBIDDEN: "Verification failed — please retry the checkbox above.",
  RATE_LIMITED: "You've hit the free-check limit for now — try again later.",
  UPSTREAM_UNAVAILABLE:
    "Deep checks are paused right now — please try again later.",
};
const DEFAULT_ERROR_MESSAGE = "Something went wrong — please try again.";

/**
 * Email-gated entry point to the Deep report.
 *
 * The Deep tier is double opt-in (deep-start.ts): this only requests the check;
 * nothing crawls until the recipient clicks the link in the confirmation email.
 * That is both the GDPR lawful basis and the joe-job-spam guard, so the copy
 * must not promise a report is already on its way.
 *
 * Turnstile renders per mount, so this form gets its own unconsumed token —
 * the Lite check already spent its one.
 */
export function DeepRequestForm({
  url,
  metricCount,
}: {
  /** The URL the visitor just ran the Lite check against. */
  url: string;
  metricCount: number;
}) {
  const siteKey = import.meta.env.TURNSTILE_SITE_KEY;
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumping this remounts the Turnstile widget, which is the only way to get a
  // fresh token: deep-start verifies (and so consumes) the token before it
  // screens the email, so a rejected submit — a disposable address, say — burns
  // the token even though the visitor only has to fix a typo. Without the
  // remount the retry button stays disabled until Turnstile self-refreshes.
  const [challengeAttempt, setChallengeAttempt] = useState(0);

  function failWith(message: string) {
    setErrorMessage(message);
    setStatus("error");
    setTurnstileToken(null);
    setChallengeAttempt((attempt) => attempt + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!turnstileToken || !consent) return;

    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(FREE_SEO_CHECK_DEEP_START_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, email, consent: true, turnstileToken }),
      });

      if (!response.ok) {
        const body = await response
          .json<{ error?: string }>()
          .catch(() => null);
        failWith(ERROR_MESSAGES[body?.error ?? ""] ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      setStatus("sent");
    } catch {
      failWith(DEFAULT_ERROR_MESSAGE);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-box border border-success/30 bg-success/5 p-4">
        <div className="flex items-start gap-3">
          <MailCheck
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-0.5 text-base-content/70">
              We sent a confirmation link to{" "}
              <span className="font-mono">{email}</span>. Click it and your deep
              check starts — you&apos;ll get a link to the full report.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-box border border-primary/30 bg-primary/5 p-4"
    >
      <DeepTierPitch metricCount={metricCount} />

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="input input-bordered w-full"
            autoComplete="email"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-xs text-base-content/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="checkbox checkbox-xs mt-0.5"
          />
          <span>
            Email me my deep SEO report. We&apos;ll send a confirmation link
            first — no marketing without your say-so.
          </span>
        </label>

        {siteKey ? (
          <TurnstileWidget
            key={challengeAttempt}
            siteKey={siteKey}
            onToken={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onLoadError={() => {
              setErrorMessage(DEFAULT_ERROR_MESSAGE);
              setStatus("error");
            }}
          />
        ) : (
          <p className="text-xs text-base-content/50">
            Deep checks aren&apos;t configured for this deployment yet.
          </p>
        )}

        {errorMessage ? (
          <p className="text-sm text-error">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary btn-sm w-full"
          disabled={
            status === "loading" ||
            !consent ||
            !turnstileToken ||
            email.length === 0
          }
        >
          {status === "loading" ? (
            "Sending…"
          ) : (
            <>
              Email me the deep report
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
