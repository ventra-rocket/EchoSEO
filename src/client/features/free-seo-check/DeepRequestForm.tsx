import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { FREE_SEO_CHECK_DEEP_START_PATH } from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import { LEGAL_PRIVACY_PATH_BY_LOCALE } from "@/shared/legal";
import { LEGAL_CHROME_COPY } from "@/client/features/legal/legal-chrome-copy";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { TurnstileWidget } from "./TurnstileWidget";
import { DeepTierPitch } from "./DeepTierPitch";
import { useTurnstileSiteKey } from "./use-turnstile-site-key";

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
  const challenge = useTurnstileSiteKey();
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
  /**
   * The mounted widget failed to load or render. The submit button is gated on
   * a token this widget can no longer mint, so without an explicit retry the
   * form is a dead end. The retry is user-initiated — remounting from inside
   * `onLoadError` would loop forever when the script is blocked outright.
   */
  const [challengeFailed, setChallengeFailed] = useState(false);

  function retryChallenge() {
    setChallengeFailed(false);
    setErrorMessage(null);
    setChallengeAttempt((attempt) => attempt + 1);
  }

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
            <p className="mt-2 text-base-content/60">{copy.sentSpamHint}</p>
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
            name="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            className="input input-bordered w-full"
            autoComplete="email"
            aria-describedby={errorMessage ? "fsc-deep-error" : undefined}
          />
        </label>

        {/* `checkbox-sm`, not `-xs`: this is a consent control at 16px, under
            the 24px target size WCAG 2.2 asks for, and it gates a form that
            collects an email address. */}
        <label className="flex cursor-pointer items-start gap-2 text-xs text-base-content/70">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="checkbox checkbox-sm mt-0.5"
          />
          <span>
            {copy.consentLabel}{" "}
            {/* Asking for an email beside a consent box, with no way to read
                what happens to it, is the wrong place to make someone hunt. */}
            <a
              href={LEGAL_PRIVACY_PATH_BY_LOCALE[locale]}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-base-content"
            >
              {LEGAL_CHROME_COPY[locale].privacyLinkLabel}
            </a>
          </span>
        </label>

        {challengeFailed ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-error">
              {copy.challengeLoadError}
            </p>
            <button
              type="button"
              onClick={retryChallenge}
              className="btn btn-outline btn-xs"
            >
              {copy.challengeRetry}
            </button>
          </div>
        ) : challenge.status === "ready" ? (
          <TurnstileWidget
            key={challengeAttempt}
            siteKey={challenge.siteKey}
            locale={locale}
            onToken={(token) => {
              // A token that lands after a failure report supersedes it —
              // clear the failed state so the retry UI can't sit beside a
              // form that is actually ready to submit.
              setChallengeFailed(false);
              setTurnstileToken(token);
            }}
            onExpire={() => setTurnstileToken(null)}
            onLoadError={() => setChallengeFailed(true)}
          />
        ) : challenge.status === "unconfigured" ? (
          <p className="text-xs text-base-content/60">{copy.unconfigured}</p>
        ) : challenge.status === "unavailable" ? (
          // The config could not be loaded, which is not the same fact as
          // "not configured" — say so without promising a retry we don't have.
          <p role="alert" className="text-sm text-error">
            {copy.challengeLoadError}
          </p>
        ) : (
          <div className="flex justify-center" role="status">
            <span className="loading loading-spinner loading-sm" />
          </div>
        )}

        {errorMessage ? (
          // `role="alert"` so the failure is announced when it appears; the id
          // ties it to the email input above, which most of these errors
          // (disposable inbox, malformed address) are about.
          <p id="fsc-deep-error" role="alert" className="text-sm text-error">
            {errorMessage}
          </p>
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
