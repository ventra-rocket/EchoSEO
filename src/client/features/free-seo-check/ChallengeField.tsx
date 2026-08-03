import type { Locale } from "@/client/i18n/config";
import { TurnstileWidget } from "./TurnstileWidget";
import type { LandingCopy } from "./landing-copy";
import type { TurnstileSiteKeyState } from "./use-turnstile-site-key";

/**
 * The landing form's challenge field. It is framed and labelled like the URL
 * input above it (same border, radius, and label tier), so the third-party
 * iframe reads as a form field rather than a stray grey box between the input
 * and the button. The min-height reserves the widget's 65px so the frame
 * doesn't collapse-then-jump while the script loads. The loading/
 * unconfigured/unavailable states stand in for the widget when there is
 * nothing to render.
 */
export function ChallengeField({
  copy,
  locale,
  challenge,
  challengeAttempt,
  onToken,
  onExpire,
  onLoadError,
}: {
  copy: LandingCopy;
  locale: Locale;
  challenge: TurnstileSiteKeyState;
  /** Bumped by the parent to remount the widget for a fresh token. */
  challengeAttempt: number;
  onToken: (token: string) => void;
  onExpire: () => void;
  onLoadError: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <span
        id="fsc-challenge-label"
        className="block font-mono text-xs uppercase tracking-widest text-base-content/60"
      >
        {copy.challengeLabel}
      </span>
      <div
        role="group"
        aria-labelledby="fsc-challenge-label"
        className="grid min-h-[77px] items-center rounded-lg border border-base-300 bg-base-100 p-1.5"
      >
        {challenge.status === "ready" ? (
          <TurnstileWidget
            key={challengeAttempt}
            siteKey={challenge.siteKey}
            locale={locale}
            onToken={onToken}
            onExpire={onExpire}
            onLoadError={onLoadError}
          />
        ) : challenge.status === "loading" ? (
          <div className="flex justify-center" role="status">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : (
          <p className="px-2 text-sm text-warning" role="alert">
            {challenge.status === "unconfigured"
              ? copy.turnstileUnconfigured
              : copy.turnstileLoadError}
          </p>
        )}
      </div>
    </div>
  );
}
