import { z } from "zod";
import {
  getCurrentAuthRedirect,
  getOAuthSignedQuery,
} from "@/lib/auth-redirect";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";

export const authRedirectSearchSchema = z.object({
  redirect: z.string().optional(),
});

export function useAuthPageState(redirect: string | undefined) {
  const redirectTo = getCurrentAuthRedirect(redirect);
  const oauthQuery =
    typeof window !== "undefined"
      ? getOAuthSignedQuery(window.location.search)
      : null;
  const isHostedMode = isHostedClientAuthMode();
  const isGoogleAuthEnabled =
    isHostedMode && import.meta.env.GOOGLE_AUTH_ENABLED === "true";

  return {
    redirectTo,
    oauthQuery,
    isHostedMode,
    isGoogleAuthEnabled,
  };
}

export function AuthMethodChooser({
  googleLabel,
  showGoogle = false,
  emailLabel = "Continue with email",
  isBusy,
  disabled,
  onContinueWithGoogle,
  onContinueWithEmail,
}: {
  googleLabel: string;
  showGoogle?: boolean;
  emailLabel?: string;
  isBusy?: boolean;
  disabled?: boolean;
  onContinueWithGoogle: () => void;
  onContinueWithEmail: () => void;
}) {
  return (
    <div className="space-y-3">
      {showGoogle ? (
        <button
          type="button"
          className="btn w-full border border-black/10 bg-white text-neutral-900 hover:border-black/20 hover:bg-neutral-50 disabled:bg-white disabled:text-neutral-500 disabled:opacity-70"
          onClick={onContinueWithGoogle}
          disabled={disabled || isBusy}
        >
          <GoogleLogo />
          {isBusy ? "Opening Google..." : googleLabel}
        </button>
      ) : null}

      <button
        type="button"
        className="btn btn-soft w-full"
        onClick={onContinueWithEmail}
        disabled={disabled || isBusy}
      >
        {emailLabel}
      </button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.94v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.96H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.04l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .94 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthPageCard({
  title,
  helperText,
  children,
  footer,
}: {
  title: string;
  helperText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-xs space-y-6">
      <div className="text-center space-y-3">
        <EchoSeoLogo className="mx-auto size-10" />
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {helperText ? (
            <p className="text-sm text-base-content/60 mt-1">{helperText}</p>
          ) : null}
        </div>
      </div>

      {children}

      {footer ? <div className="text-center">{footer}</div> : null}
    </div>
  );
}

// The same input-plus-error row rendered six times across the two auth routes
// (name, email, password, confirm on sign-up; email and password on sign-in).
// `placeholderId` is authored at the callsite so it stays a checked
// `MessageId`; `errorId` arrives from a zod schema whose messages are ids, and
// that indirection cannot be proven to the compiler, so it is a plain `string`
// — the same convention `mutationErrorMessageId` already uses in
// DataForSeoKeyCard. `errorValues` exists for the one field whose message
// interpolates: the password-length rule reports its own bounds.
export function AuthTextField({
  type,
  placeholderId,
  value,
  onChange,
  autoComplete,
  disabled,
  required,
  minLength,
  maxLength,
  errorId,
  errorValues,
}: {
  type: "text" | "email" | "password";
  placeholderId: MessageId;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  errorId?: string | null;
  errorValues?: Record<string, number>;
}) {
  const intl = useIntl();

  return (
    <div>
      <input
        type={type}
        className="input input-bordered w-full"
        placeholder={intl.formatMessage({ id: placeholderId })}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
      />
      {errorId ? (
        <p className="mt-1 text-sm text-error">
          {intl.formatMessage({ id: errorId }, errorValues)}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    // `h-[100dvh]` + `overflow-y-auto` makes this a scroll container, and the
    // auto-margin child centers when it fits but stays fully reachable (top and
    // bottom) when it's taller than the viewport. Plain `justify-center` clips
    // the overflow with no way to scroll to it.
    <div className="h-[100dvh] flex flex-col items-center overflow-y-auto p-4 bg-base-200">
      <div className="m-auto flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
