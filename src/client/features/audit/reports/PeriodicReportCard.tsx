import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import {
  getReportSubscription,
  saveReportSubscription,
  setReportSubscriptionEnabled,
} from "@/serverFunctions/reports";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Owner/admin control for the weekly report: who receives it, and whether the
 * scheduled crawl runs at all.
 *
 * The email address is a plain field rather than "send to me", because the
 * common case is an agency routing the report to a client or a shared inbox.
 * The panel says out loud that switching this on starts a weekly crawl — that
 * is real spend and a real request against the customer's site, so it should
 * not be a surprise discovered from server logs.
 *
 * Gated by `access.canManage` at the call site, matching the server's
 * owner/admin check.
 */
export function PeriodicReportCard({
  projectId,
  auditId,
}: {
  projectId: string;
  auditId: string;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [locale, setLocale] = useState<"en" | "vi">("en");

  const subscriptionQuery = useQuery({
    queryKey: ["report-subscription", projectId, auditId],
    queryFn: () => getReportSubscription({ data: { projectId, auditId } }),
  });

  const subscription = subscriptionQuery.data ?? null;

  // Seed the form from the server exactly once per loaded subscription. Binding
  // the input straight to query data would discard what the user is typing on
  // every refetch.
  useEffect(() => {
    if (!subscription) return;
    setEmail(subscription.recipientEmail);
    setLocale(subscription.locale);
  }, [subscription]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["report-subscription", projectId, auditId],
    });

  const save = useMutation({
    mutationFn: () =>
      saveReportSubscription({
        data: { projectId, auditId, recipientEmail: email.trim(), locale },
      }),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "audit.reports.enabledToast" }));
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          intl.formatMessage({ id: "audit.reports.saveError" }),
        ),
      ),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      setReportSubscriptionEnabled({ data: { projectId, auditId, enabled } }),
    onSuccess: (result) => {
      toast.success(
        intl.formatMessage({
          id: result?.enabled
            ? "audit.reports.resumedToast"
            : "audit.reports.pausedToast",
        }),
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          intl.formatMessage({ id: "audit.reports.scheduleError" }),
        ),
      ),
  });

  const busy = save.isPending || toggle.isPending;
  const emailIsValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  // A footer one-click unsubscribe belongs to the recipient, so there is no
  // "resume" for it. The only way back is deliberately re-entering the address,
  // which is what `save` does.
  const optedOut = Boolean(subscription?.unsubscribedAt);

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <CalendarClock className="size-4" />
            {intl.formatMessage({ id: "audit.reports.heading" })}
          </h2>
          <p className="text-xs text-base-content/60">
            {intl.formatMessage({ id: "audit.reports.description" })}
          </p>
        </div>

        <label className="form-control w-full max-w-sm">
          <span className="label-text text-xs">
            {intl.formatMessage({ id: "audit.reports.recipientLabel" })}
          </span>
          <input
            type="email"
            className="input input-sm input-bordered w-full"
            placeholder={intl.formatMessage({
              id: "audit.reports.emailPlaceholder",
            })}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>

        <label className="form-control w-full max-w-sm">
          <span className="label-text text-xs">
            {intl.formatMessage({ id: "language.label" })}
          </span>
          <select
            className="select select-sm select-bordered w-full"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "vi" ? "vi" : "en")
            }
            disabled={busy}
          >
            <option value="en">
              {intl.formatMessage({ id: "language.english" })}
            </option>
            <option value="vi">
              {intl.formatMessage({ id: "language.vietnamese" })}
            </option>
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary gap-2"
            disabled={busy || !emailIsValid}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {intl.formatMessage({
              id: subscription
                ? optedOut
                  ? "audit.reports.askAgainButton"
                  : "audit.reports.saveButton"
                : "audit.reports.turnOnButton",
            })}
          </button>

          {subscription && !optedOut ? (
            <button
              type="button"
              className="btn btn-sm btn-outline gap-2"
              disabled={busy}
              onClick={() => toggle.mutate(!subscription.enabled)}
            >
              {toggle.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {intl.formatMessage({
                id: subscription.enabled
                  ? "audit.reports.pauseButton"
                  : "audit.reports.resumeButton",
              })}
            </button>
          ) : null}
        </div>

        {subscription ? (
          <p className="text-xs text-base-content/60">
            {optedOut
              ? intl.formatMessage(
                  { id: "audit.reports.unsubscribedStatus" },
                  {
                    email: subscription.recipientEmail,
                    date: intl.formatDate(subscription.unsubscribedAt ?? "", {
                      dateStyle: "medium",
                    }),
                  },
                )
              : subscription.enabled
                ? intl.formatMessage(
                    { id: "audit.reports.activeStatus" },
                    { maxPages: subscription.maxPages },
                  )
                : intl.formatMessage({ id: "audit.reports.pausedStatus" })}
            {subscription.lastSentAt
              ? intl.formatMessage(
                  { id: "audit.reports.lastSentSuffix" },
                  {
                    date: intl.formatDate(subscription.lastSentAt, {
                      dateStyle: "medium",
                    }),
                  },
                )
              : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
