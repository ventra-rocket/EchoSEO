/**
 * Renders the report HTML into the bytes an export job stores.
 *
 * PDF goes through Cloudflare Browser Rendering, which needs Workers Paid. The
 * editable copy is the same HTML served as `.doc`: Word and Google Docs both open
 * it with tables and styling intact, so one template covers both outputs.
 *
 * The browser is closed in a `finally`. A leaked session holds a slot in the
 * account's concurrency budget until it times out, and the symptom is a later,
 * unrelated export failing to launch — so the cleanup cannot be conditional on
 * the render succeeding.
 */
import { launch } from "@cloudflare/puppeteer";
import { env } from "cloudflare:workers";
import type { AuditExportFormat } from "@/shared/audit-export-format";

/**
 * How long the two calls that touch the document may take. A hung page would
 * otherwise hold a session for its whole idle timeout; the report is static HTML
 * with no network of its own, so this is generous.
 *
 * `launch` is deliberately *not* wrapped: racing it would leave an acquired
 * session with no reference to close, which is worse than waiting. A hang there
 * is bounded only by the Workflow step, and the slot frees on the browser's own
 * idle window.
 */
const RENDER_TIMEOUT_MS = 30_000;

export async function renderReportArtifact(input: {
  format: Exclude<AuditExportFormat, "zip">;
  html: string;
}): Promise<{ bytes: Uint8Array }> {
  if (input.format === "doc") {
    return { bytes: new TextEncoder().encode(input.html) };
  }
  if (input.format === "pdf") {
    return { bytes: await renderPdf(input.html) };
  }
  // Exhaustive on purpose: a fourth format added to the shared media table would
  // otherwise compile straight through here and be stored as PDF bytes under a
  // new extension — the exact mislabelling that table exists to prevent.
  input.format satisfies never;
  throw new Error(`Unsupported report format: ${String(input.format)}`);
}

async function renderPdf(html: string): Promise<Uint8Array> {
  const browser = await launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    // `load` rather than `networkidle0`: the document carries its own stylesheet
    // and no external requests, so waiting for network silence would only add
    // the idle window to every render.
    await page.setContent(html, {
      waitUntil: "load",
      timeout: RENDER_TIMEOUT_MS,
    });
    const pdf = await page.pdf({
      format: "A4",
      // The stylesheet carries the page box, so margins are not set twice.
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="width:100%;font-size:8pt;color:#6b7280;padding:0 16mm;' +
        'text-align:right;font-family:sans-serif">' +
        '<span class="pageNumber"></span>/<span class="totalPages"></span></div>',
      timeout: RENDER_TIMEOUT_MS,
    });
    return new Uint8Array(pdf);
  } finally {
    // A failed close must neither replace the render's own error nor fail a
    // render that already produced bytes: the artifact is not in R2 yet, so a
    // throw here would retry the step and spend a second session redoing work
    // that succeeded.
    await browser.close().catch((error: unknown) => {
      console.error("audit report: browser close failed", error);
    });
  }
}
