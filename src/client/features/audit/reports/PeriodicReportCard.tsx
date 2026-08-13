import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
      toast.success("Weekly report is on. The first one goes out Monday.");
      void invalidate();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not save the report settings.")),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      setReportSubscriptionEnabled({ data: { projectId, auditId, enabled } }),
    onSuccess: (result) => {
      toast.success(
        result?.enabled ? "Weekly report resumed." : "Weekly report paused.",
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not change the schedule.")),
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
            Weekly report
          </h2>
          <p className="text-xs text-base-content/60">
            Every Monday at 08:00 (UTC+7) we re-crawl this site, then email what
            changed — new issues with the exact fix steps first, Search Console
            numbers underneath. Critical problems are emailed as soon as a crawl
            finds them, at most once a day.
          </p>
        </div>

        <label className="form-control w-full max-w-sm">
          <span className="label-text text-xs">Send the report to</span>
          <input
            type="email"
            className="input input-sm input-bordered w-full"
            placeholder="seo@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>

        <label className="form-control w-full max-w-sm">
          <span className="label-text text-xs">Language</span>
          <select
            className="select select-sm select-bordered w-full"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "vi" ? "vi" : "en")
            }
            disabled={busy}
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
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
            {subscription
              ? optedOut
                ? "Ask again"
                : "Save"
              : "Turn on weekly report"}
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
              {subscription.enabled ? "Pause" : "Resume"}
            </button>
          ) : null}
        </div>

        {subscription ? (
          <p className="text-xs text-base-content/60">
            {optedOut
              ? `${subscription.recipientEmail} unsubscribed on ${new Date(subscription.unsubscribedAt ?? "").toLocaleDateString()} · re-enter the address above and save to ask again`
              : subscription.enabled
                ? `Active · crawls up to ${subscription.maxPages} pages each run`
                : "Paused · no crawl and no email until you resume"}
            {subscription.lastSentAt
              ? ` · last sent ${new Date(subscription.lastSentAt).toLocaleDateString()}`
              : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
