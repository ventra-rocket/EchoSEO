import { GoogleGlyph } from "@/client/features/gsc/GoogleGlyph";
import type { GscGrantFailureReason } from "@/shared/gsc";

type SiteOption = {
  siteUrl: string;
  permissionLevel: string;
  selectable: boolean;
  isSelected: boolean;
};

type SecondaryAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * What the user can actually do about each failure. "Reconnect" appears only
 * where a fresh grant can fix the problem: sending a rate-limited or
 * policy-blocked user back through Google's consent screen puts them in a loop
 * that cannot succeed, which is what this table exists to prevent.
 */
export const GSC_FAILURE_COPY: Record<
  GscGrantFailureReason,
  { message: string; action: "connect" | "reconnect" | "retry" }
> = {
  not_connected: {
    message:
      "No Google account is connected yet. Connect one to pick a Search Console property.",
    action: "connect",
  },
  consent_blocked: {
    message:
      "Google refused Search Console access for this account. If your organisation manages the account, an admin has to allow this app; otherwise reconnect and accept the Search Console permission.",
    action: "reconnect",
  },
  grant_expired: {
    message: "Connection expired. Reconnect to continue.",
    action: "reconnect",
  },
  provider_error: {
    message:
      "Search Console did not answer. This is usually a short rate limit — try again in a minute.",
    action: "retry",
  },
};

/**
 * Verified-property selector for a connected Google account. Shared by the
 * Integrations card and the onboarding step. `secondaryAction` is optional —
 * omit it where there's nothing to cancel/disconnect (e.g. onboarding).
 */
export function SitePicker({
  loading,
  failure,
  sites,
  selectedSiteUrl,
  onSelect,
  onSave,
  saving,
  onConnect,
  onRetry,
  secondaryAction,
}: {
  loading: boolean;
  /** Null while the listing is healthy. */
  failure: GscGrantFailureReason | null;
  sites: SiteOption[];
  selectedSiteUrl: string;
  onSelect: (siteUrl: string) => void;
  onSave: () => void;
  saving: boolean;
  /** Starts the Google OAuth link flow, for both a first connect and a relink. */
  onConnect: () => void;
  onRetry: () => void;
  secondaryAction?: SecondaryAction;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <span className="loading loading-spinner loading-sm" />
        Loading properties…
      </div>
    );
  }
  if (failure) {
    const { message, action } = GSC_FAILURE_COPY[failure];
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">{message}</p>
        {action === "retry" ? (
          <button type="button" onClick={onRetry} className="btn btn-sm">
            Try again
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="inline-flex items-center gap-2.5 rounded-lg border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-base-200"
          >
            <GoogleGlyph className="size-[18px]" />
            {action === "connect"
              ? "Connect with Google"
              : "Reconnect with Google"}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-base-content/80">
          Property
        </span>
        <select
          className="select select-bordered w-full max-w-md"
          value={selectedSiteUrl}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="" disabled>
            Select a property…
          </option>
          {sites.map((site) => (
            <option
              key={site.siteUrl}
              value={site.siteUrl}
              disabled={!site.selectable}
            >
              {site.siteUrl}
              {site.selectable ? "" : "  (no access)"}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={!selectedSiteUrl || saving}
        >
          {saving ? "Saving…" : "Save property"}
        </button>
        {secondaryAction ? (
          <button
            type="button"
            className={[
              "btn btn-ghost btn-sm",
              secondaryAction.destructive ? "text-error hover:bg-error/10" : "",
            ].join(" ")}
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
