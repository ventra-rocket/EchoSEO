import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { GoogleGlyph } from "@/client/features/gsc/GoogleGlyph";
import { SelfHostedSetupWarning } from "@/client/features/gsc/SelfHostedSetupWarning";
import { SitePicker } from "@/client/features/gsc/SitePicker";
import { startGscLink } from "@/client/features/gsc/startGscLink";
import {
  disconnectGsc,
  getGscConnection,
  listGscSites,
  setGscSite,
} from "@/serverFunctions/gsc";

const GRANT_STATUS_KEY = ["gscGrantStatus"];

export function SearchConsoleConnectionCard({
  projectId,
}: {
  projectId: string;
}) {
  const intl = useIntl();
  const hosted = isHostedClientAuthMode();
  const queryClient = useQueryClient();
  const [picking, setPicking] = React.useState(false);
  const [selectedSiteUrl, setSelectedSiteUrl] = React.useState<string>("");

  const connectionKey = ["gscConnection", projectId];
  const connectionQuery = useQuery({
    queryKey: connectionKey,
    queryFn: () => getGscConnection({ data: { projectId } }),
  });
  const connection = connectionQuery.data;
  const connected = Boolean(connection?.connected);
  const selfHostedNeedsSetup =
    !hosted && connectionQuery.isSuccess && !connection?.googleOAuthConfigured;

  const showPicker = picking || (connection?.currentUserHasGrant && !connected);
  const sitesQuery = useQuery({
    queryKey: ["gscSites", projectId],
    queryFn: () => listGscSites({ data: { projectId } }),
    enabled: Boolean(showPicker && !selfHostedNeedsSetup),
  });
  const failure = sitesQuery.data?.failure ?? null;

  React.useEffect(() => {
    if (!failure) return;

    void queryClient.invalidateQueries({
      queryKey: ["gscConnection", projectId],
    });
    void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
  }, [failure, queryClient, projectId]);

  const setSiteMutation = useMutation({
    mutationFn: (siteUrl: string) =>
      setGscSite({ data: { projectId, siteUrl } }),
    onSuccess: () => {
      captureClientEvent("gsc:property_select");
      toast.success(intl.formatMessage({ id: "gsc.card.connectedToast" }));
      setPicking(false);
      void queryClient.invalidateQueries({ queryKey: connectionKey });
      void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
      // The Search Performance report caches {connected:false}; refresh it so
      // the page shows data right after connecting instead of the stale card.
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformance", projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformanceTable", projectId],
      });
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "common.error.default" }),
        ),
      ),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectGsc({ data: { projectId } }),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "gsc.card.disconnectedToast" }));
      setPicking(false);
      void queryClient.invalidateQueries({ queryKey: connectionKey });
      // Disconnect can drop the account-level grant server-side; keep the
      // shared grant-status cache (onboarding step + re-engagement nudge) honest.
      void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformance", projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformanceTable", projectId],
      });
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "common.error.default" }),
        ),
      ),
  });

  const handleConnect = () => void startGscLink(window.location.href);

  return (
    <IntegrationCard
      status={
        connectionQuery.isLoading
          ? undefined
          : selfHostedNeedsSetup
            ? "setup_required"
            : connected
              ? "connected"
              : "disconnected"
      }
    >
      {connectionQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-base-content/50">
          <span className="loading loading-spinner loading-sm" />
          {intl.formatMessage({ id: "gsc.card.checking" })}
        </div>
      ) : selfHostedNeedsSetup ? (
        <SelfHostedSetupWarning />
      ) : connected && !picking ? (
        <ConnectedState
          siteUrl={connection?.siteUrl ?? ""}
          connectedByEmail={connection?.connectedByEmail ?? null}
          onChange={() => {
            setSelectedSiteUrl(connection?.siteUrl ?? "");
            setPicking(true);
          }}
          onDisconnect={() => disconnectMutation.mutate()}
          disconnecting={disconnectMutation.isPending}
        />
      ) : showPicker ? (
        <SitePicker
          loading={sitesQuery.isLoading}
          failure={failure ?? (sitesQuery.isError ? "provider_error" : null)}
          sites={sitesQuery.data?.sites ?? []}
          selectedSiteUrl={selectedSiteUrl}
          onSelect={setSelectedSiteUrl}
          onSave={() =>
            selectedSiteUrl && setSiteMutation.mutate(selectedSiteUrl)
          }
          saving={setSiteMutation.isPending}
          onConnect={handleConnect}
          onRetry={() => void sitesQuery.refetch()}
          secondaryAction={
            connected
              ? {
                  label: intl.formatMessage({ id: "gsc.cancel" }),
                  onClick: () => setPicking(false),
                }
              : {
                  label: intl.formatMessage({ id: "gsc.disconnect" }),
                  destructive: true,
                  disabled: disconnectMutation.isPending,
                  onClick: () => disconnectMutation.mutate(),
                }
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-base-content/70">
            {intl.formatMessage({ id: "gsc.card.pitch" })}
          </p>
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex items-center gap-2.5 rounded-lg border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-semibold text-base-content shadow-sm transition hover:bg-base-200 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <GoogleGlyph className="size-[18px]" />
            {intl.formatMessage({ id: "gsc.connectWithGoogle" })}
          </button>
        </div>
      )}
    </IntegrationCard>
  );
}

// ---------------------------------------------------------------------------
// Card shell
// ---------------------------------------------------------------------------

function IntegrationCard({
  status,
  children,
}: {
  status?: "connected" | "disconnected" | "setup_required";
  children: React.ReactNode;
}) {
  const intl = useIntl();
  return (
    <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {intl.formatMessage({ id: "gsc.card.title" })}
          </h2>
          <p className="mt-0.5 text-sm text-base-content/55">
            {intl.formatMessage({ id: "gsc.card.subtitle" })}
          </p>
        </div>
        {status ? <StatusPill status={status} /> : null}
      </div>
      <div className="border-t border-base-300 p-5 sm:p-6">{children}</div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "connected" | "disconnected" | "setup_required";
}) {
  const intl = useIntl();
  const connected = status === "connected";
  const setupRequired = status === "setup_required";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        connected
          ? "border-success/30 bg-success/10 text-success"
          : setupRequired
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-base-300 bg-base-200 text-base-content/60",
      ].join(" ")}
    >
      <span
        className={[
          "size-1.5 rounded-full",
          connected
            ? "bg-success"
            : setupRequired
              ? "bg-warning"
              : "bg-base-content/40",
        ].join(" ")}
      />
      {intl.formatMessage({
        id: connected
          ? "gsc.card.status.connected"
          : setupRequired
            ? "gsc.card.status.setupRequired"
            : "gsc.card.status.notConnected",
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Connected state
// ---------------------------------------------------------------------------

function ConnectedState({
  siteUrl,
  connectedByEmail,
  onChange,
  onDisconnect,
  disconnecting,
}: {
  siteUrl: string;
  connectedByEmail: string | null;
  onChange: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const intl = useIntl();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-200/40 p-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border border-base-300 bg-base-100">
          <GoogleGlyph className="size-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">{siteUrl}</p>
          {connectedByEmail ? (
            <p className="truncate text-xs text-base-content/55">
              {intl.formatMessage(
                { id: "gsc.connectedState.connectedBy" },
                { email: connectedByEmail },
              )}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onChange}
        >
          {intl.formatMessage({ id: "gsc.connectedState.changeProperty" })}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm text-error hover:bg-error/10"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          {intl.formatMessage({ id: "gsc.disconnect" })}
        </button>
      </div>
    </div>
  );
}
