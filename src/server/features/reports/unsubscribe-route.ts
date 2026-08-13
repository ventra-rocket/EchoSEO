import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { ReportSubscriptionRepository } from "@/server/features/reports/ReportSubscriptionRepository";
import { escapeHtml } from "@/server/services/seo-check/output-encode";
import { REPORT_UNSUBSCRIBE_PATH } from "@/shared/reports";

/**
 * Unsubscribe endpoint for periodic reports.
 *
 * Two callers with incompatible expectations share one URL:
 *
 * - **A mail provider doing RFC 8058 one-click.** Gmail and Yahoo POST to the
 *   `List-Unsubscribe` URL with no cookies, no session, and no user present.
 *   That POST must unsubscribe immediately and answer 200 — anything else and
 *   the provider counts the sender as ignoring opt-outs.
 * - **A person clicking the link in the mail.** That is a GET, and a GET must
 *   *not* unsubscribe: mail clients and security scanners prefetch links, and
 *   an owner who never touched the message would silently lose their reports.
 *   So GET renders a one-button confirmation that POSTs back here.
 *
 * The recipient does not have to be a signed-in workspace member — the address
 * can be a shared inbox — so this is a raw Worker route dispatched before the
 * auth pipeline. The token is the only authority, which is why it is a CSPRNG
 * value with a unique index rather than anything guessable.
 */

const COPY = {
  confirmTitle: "Turn off these emails?",
  confirmBody:
    "You will stop receiving the periodic SEO report for this site. Your audit data and account are not affected, and you can switch reports back on in the app at any time.",
  confirmButton: "Turn off the emails",
  doneTitle: "Unsubscribed",
  doneBody:
    "You will not receive further periodic reports for this site. You can switch them back on in the app whenever you want.",
  invalidTitle: "Link not recognised",
  invalidBody:
    "This unsubscribe link is not valid. It may belong to a site that has since been deleted. If you keep receiving these emails, reply to this address and we will remove you by hand.",
};

const PAGE_STYLE = [
  "margin:0",
  "padding:48px 24px",
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  "font-size:16px",
  "line-height:1.6",
  "color:#1f2937",
  "max-width:520px",
].join(";");

function page(title: string, bodyHtml: string, status: number): Response {
  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    `<body style="${PAGE_STYLE}">`,
    `<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>`,
    bodyHtml,
    "</body>",
    "</html>",
  ].join("\n");
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Nothing here should be cached: the same URL renders a confirmation
      // before the click and a result after it.
      "cache-control": "no-store",
    },
  });
}

export async function handleReportUnsubscribeRequest(
  request: Request,
): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return page(
      COPY.invalidTitle,
      `<p>${escapeHtml(COPY.invalidBody)}</p>`,
      400,
    );
  }

  if (request.method === "GET") {
    const subscription =
      await ReportSubscriptionRepository.getByUnsubscribeToken(token);
    if (!subscription) {
      return page(
        COPY.invalidTitle,
        `<p>${escapeHtml(COPY.invalidBody)}</p>`,
        404,
      );
    }
    if (subscription.unsubscribedAt) {
      return page(COPY.doneTitle, `<p>${escapeHtml(COPY.doneBody)}</p>`, 200);
    }
    const action = `${REPORT_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`;
    return page(
      COPY.confirmTitle,
      [
        `<p>${escapeHtml(COPY.confirmBody)}</p>`,
        `<form method="post" action="${escapeHtml(action)}">`,
        `<button type="submit" style="background:#b91c1c;color:#ffffff;border:0;border-radius:6px;padding:12px 20px;font-size:16px;cursor:pointer">${escapeHtml(COPY.confirmButton)}</button>`,
        "</form>",
      ].join("\n"),
      200,
    );
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  const subscription =
    await ReportSubscriptionRepository.markUnsubscribed(token);
  if (!subscription) {
    return page(
      COPY.invalidTitle,
      `<p>${escapeHtml(COPY.invalidBody)}</p>`,
      404,
    );
  }

  // Stop the alarm as well as the delivery gate. Leaving the schedule armed
  // would wake the agent every week to launch a crawl whose report is thrown
  // away — real spend for a mail nobody receives.
  try {
    const agent = await getAgentByName(
      env.WEEKLY_REPORT,
      subscription.targetId,
    );
    await agent.disarm();
  } catch (error) {
    // The D1 flag already stops delivery, so a failure here degrades to a
    // wasted weekly crawl rather than a broken opt-out. Never fail the request
    // over it: the mail provider reads a non-200 as "opt-out ignored".
    console.error(
      `[weekly-report] unsubscribed ${subscription.targetId} but could not disarm its agent`,
      error,
    );
  }

  return page(COPY.doneTitle, `<p>${escapeHtml(COPY.doneBody)}</p>`, 200);
}
