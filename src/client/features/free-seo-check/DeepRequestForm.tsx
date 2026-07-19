import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { FREE_SEO_CHECK_DEEP_START_PATH } from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { TurnstileWidget } from "./TurnstileWidget";
import { DeepTierPitch } from "./DeepTierPitch";

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
  locale,
}: {
  /** The URL the visitor just ran the Lite check against. */
  url: string;
  metricCount: number;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].deepForm;
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
        // `locale` rides along so the confirmation email and the report page
        // come back in the language the visitor ran the check in.
        body: JSON.stringify({
          url,
          email,
          consent: true,
          turnstileToken,
          locale,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json<{ error?: string }>()
          .catch(() => null);
        failWith(copy.errors[body?.error ?? ""] ?? copy.errorDefault);
        return;
      }

      setStatus("sent");
    } catch {
      failWith(copy.errorDefault);
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
            <p className="font-medium">{copy.sentTitle}</p>
            <p className="mt-0.5 text-base-content/70">
              {copy.sentBodyBefore} <span className="font-mono">{email}</span>
              {copy.sentBodyAfter}
            </p>
            {/* Our sending domain is new, so mail providers do not trust it yet
                and this mail can land in spam. Nothing runs until the link is
                clicked, so someone who never finds it waits forever for a report
                that was never started — saying so costs a line and saves them. */}
            <p className="mt-2 text-base-content/50">{copy.sentSpamHint}</p>
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
      <DeepTierPitch metricCount={metricCount} locale={locale} />

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">{copy.emailLabel}</span>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
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
          <span>{copy.consentLabel}</span>
        </label>

        {siteKey ? (
          <TurnstileWidget
            key={challengeAttempt}
            siteKey={siteKey}
            locale={locale}
            onToken={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onLoadError={() => {
              setErrorMessage(copy.errorDefault);
              setStatus("error");
            }}
          />
        ) : (
          <p className="text-xs text-base-content/50">{copy.unconfigured}</p>
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
            copy.submitLoading
          ) : (
            <>
              {copy.submitIdle}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
