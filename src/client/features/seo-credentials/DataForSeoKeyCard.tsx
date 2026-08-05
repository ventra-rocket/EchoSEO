import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { toast } from "sonner";
import { getErrorCode } from "@/client/lib/error-messages";
import {
  deleteDataforseoKey,
  getDataforseoKeyStatus,
  saveDataforseoKey,
} from "@/serverFunctions/seo-credentials";

const STATUS_KEY = ["dataforseoKeyStatus"];
const GET_KEY_URL = "https://dataforseo.com/";

/** Map a failed save/remove to a localized toast: a rejected or malformed key is
 * shown as invalid, an authorization failure as forbidden, everything else as a
 * generic error. */
function mutationErrorMessageId(error: unknown): string {
  switch (getErrorCode(error)) {
    case "DATAFORSEO_AUTH_FAILED":
    case "VALIDATION_ERROR":
      return "seoProvider.toast.invalidKey";
    case "FORBIDDEN":
      return "seoProvider.toast.forbidden";
    default:
      return "seoProvider.toast.error";
  }
}

/**
 * Settings card for the organization's DataForSEO API key. Owners and admins can
 * paste their own key (validated live before it is stored) or remove it to fall
 * back to the platform default. The key is write-only from the client: the
 * status query returns a source badge and a masked last-4, never the key itself.
 * Rendered only for callers the server reports as able to manage the key.
 */
export function DataForSeoKeyCard() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = React.useState("");

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => getDataforseoKeyStatus(),
  });
  const status = statusQuery.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    // Also refresh the app-wide status the feature-query gates read
    // (["seoApiKeyStatus"]) so connecting or removing a key flips the gates and
    // banner immediately instead of after the 5-minute staleTime.
    void queryClient.invalidateQueries({ queryKey: ["seoApiKeyStatus"] });
  };

  const saveMutation = useMutation({
    mutationFn: (key: string) => saveDataforseoKey({ data: { apiKey: key } }),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "seoProvider.toast.saved" }));
      setApiKey("");
      invalidate();
    },
    onError: (error) =>
      toast.error(intl.formatMessage({ id: mutationErrorMessageId(error) })),
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteDataforseoKey(),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "seoProvider.toast.removed" }));
      invalidate();
    },
    onError: (error) =>
      toast.error(intl.formatMessage({ id: mutationErrorMessageId(error) })),
  });

  // The server is the real authority; once we know the caller cannot manage the
  // key, hide the whole section (viewers never see it).
  if (statusQuery.isSuccess && !status?.canManage) return null;

  const busy = saveMutation.isPending || removeMutation.isPending;
  const trimmedKey = apiKey.trim();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-base-content/50">
        {intl.formatMessage({ id: "seoProvider.section" })}
      </h2>
      <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-sm text-base-content/60">
              {intl.formatMessage({ id: "seoProvider.description" })}
            </p>
            <a
              href={GET_KEY_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {intl.formatMessage({ id: "seoProvider.getKey" })}
            </a>
          </div>
          {statusQuery.isLoading ? null : (
            <SourceBadge
              source={status?.source ?? "none"}
              last4={status?.last4}
            />
          )}
        </div>

        <div className="border-t border-base-300 p-5 sm:p-6">
          {statusQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              {intl.formatMessage({ id: "seoProvider.checking" })}
            </div>
          ) : statusQuery.isError ? (
            <p className="text-sm text-error">
              {intl.formatMessage({ id: "seoProvider.loadError" })}
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (trimmedKey && !busy) saveMutation.mutate(trimmedKey);
              }}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="dataforseo-api-key"
                  className="block text-sm font-medium"
                >
                  {intl.formatMessage({ id: "seoProvider.inputLabel" })}
                </label>
                <input
                  id="dataforseo-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  disabled={busy}
                  onChange={(event) => setApiKey(event.currentTarget.value)}
                  placeholder={intl.formatMessage({
                    id: "seoProvider.placeholder",
                  })}
                  className="min-h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 font-mono text-sm shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={!trimmedKey || busy}
                  aria-busy={saveMutation.isPending}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  {intl.formatMessage({
                    id: saveMutation.isPending
                      ? "seoProvider.saving"
                      : "seoProvider.save",
                  })}
                </button>

                {status?.source === "org" ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-busy={removeMutation.isPending}
                    onClick={() => removeMutation.mutate()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-error transition hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {intl.formatMessage({
                      id: removeMutation.isPending
                        ? "seoProvider.removing"
                        : "seoProvider.remove",
                    })}
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function SourceBadge({
  source,
  last4,
}: {
  source: "org" | "global" | "none";
  last4: string | null | undefined;
}) {
  const intl = useIntl();
  const isOrg = source === "org";
  const isGlobal = source === "global";
  const label = intl.formatMessage({
    id: isOrg
      ? "seoProvider.badge.org"
      : isGlobal
        ? "seoProvider.badge.global"
        : "seoProvider.badge.none",
  });

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        isOrg
          ? "border-success/30 bg-success/10 text-success"
          : isGlobal
            ? "border-info/30 bg-info/10 text-info"
            : "border-base-300 bg-base-200 text-base-content/60",
      ].join(" ")}
    >
      <span
        className={[
          "size-1.5 rounded-full",
          isOrg ? "bg-success" : isGlobal ? "bg-info" : "bg-base-content/40",
        ].join(" ")}
      />
      {label}
      {isOrg && last4 ? (
        <span className="font-mono text-base-content/60">···· {last4}</span>
      ) : null}
    </span>
  );
}
