/**
 * Raw HTTP handler for confirming a Free Deep SEO Check opt-in.
 *
 * The confirmation email links to the SSR landing route, which POSTs the token
 * here (POST, not the GET link, so email-scanner prefetch can't auto-confirm).
 * On success it records consent, queues the report, and hands off to the
 * enqueue seam.
 *
 * The report advance is a compare-and-swap that runs on every valid confirm —
 * including the already-confirmed path — so the Deep audit is enqueued exactly
 * once even under concurrent confirms, and a report stranded in `confirming` by
 * an earlier partial failure still recovers on retry.
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { confirmDeepCheckRequestSchema } from "@/shared/free-seo-check";
import { checkIpRateLimit } from "./rate-limit-do";
import { findLeadByConfirmToken, markLeadConfirmed } from "./leads-repository";
import {
  findReportByLeadId,
  tryQueueConfirmingReport,
} from "./seo-reports-repository";
import { dispatchDeepCheck } from "./deep-dispatch";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "./http-response";

export async function handleConfirmDeepCheckRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `confirm:${clientIp(request)}`,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const body = confirmDeepCheckRequestSchema.safeParse(
      await readJsonBody(request),
    );
    if (!body.success) throw new AppError("VALIDATION_ERROR");
    const { token } = body.data;

    const lead = await findLeadByConfirmToken(token);
    if (!lead) throw new AppError("NOT_FOUND");

    const alreadyConfirmed = lead.consentConfirmedAt !== null;
    if (!alreadyConfirmed) {
      if (Date.parse(lead.confirmTokenExpiresAt) < Date.now()) {
        throw new AppError("VALIDATION_ERROR");
      }
      await markLeadConfirmed(lead.id, new Date().toISOString());
    }

    // Advance the paired report exactly once. The CAS is a no-op if a concurrent
    // confirm already queued it, and recovers a report left in `confirming`; the
    // dispatcher then applies the kill-switch, dedupe, and quota gates.
    const report = await findReportByLeadId(lead.id);
    if (!report) {
      console.error(`free-seo-check: confirmed lead ${lead.id} has no report`);
    } else if (await tryQueueConfirmingReport(report.id)) {
      await dispatchDeepCheck({
        reportId: report.id,
        domain: report.domain,
        url: report.url,
        emailNormalized: lead.emailNormalized,
      });
    }

    // Hand the report id back so the confirm page can link straight to /r/{id}.
    // The in-browser link is the primary delivery channel — email is only a
    // convenience, and must never be the sole way to reach a finished report.
    return jsonResponse({
      status: alreadyConfirmed ? "already_confirmed" : "confirmed",
      reportId: report?.id ?? null,
    });
  } catch (error) {
    return errorResponse(error, request);
  }
}
