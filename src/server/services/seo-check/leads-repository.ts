/**
 * D1 access for Free Deep SEO Checker leads.
 *
 * Thin DB seam over the `leads` table — id/token generation and validation live
 * in the request handlers so this module stays trivially mockable in tests.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leads, seoReports } from "@/db/schema";
import type { DeepReportStatus } from "@/db/free-seo-check.schema";

type LeadRow = typeof leads.$inferSelect;

interface NewLead {
  id: string;
  email: string;
  emailNormalized: string;
  url: string;
  domain: string;
  locale: string;
  source: string;
  confirmToken: string;
  confirmTokenExpiresAt: string;
}

interface NewReport {
  id: string;
  leadId: string;
  domain: string;
  url: string;
  locale: string;
  status: DeepReportStatus;
}

/**
 * Insert the lead and its report in a single D1 batch (one transaction), so a
 * failure never leaves an orphaned lead (email + live token) without a report.
 */
export async function createLeadWithReport(
  lead: NewLead,
  report: NewReport,
): Promise<void> {
  await db.batch([
    db.insert(leads).values(lead),
    db.insert(seoReports).values(report),
  ]);
}

export async function findLeadByConfirmToken(
  token: string,
): Promise<LeadRow | null> {
  const [row] = await db
    .select()
    .from(leads)
    .where(eq(leads.confirmToken, token))
    .limit(1);
  return row ?? null;
}

/**
 * Records consent. The `IS NULL` guard makes a concurrent or retried confirm a
 * no-op instead of overwriting the original consent timestamp.
 */
export async function markLeadConfirmed(
  id: string,
  confirmedAt: string,
): Promise<void> {
  await db
    .update(leads)
    .set({ consentConfirmedAt: confirmedAt })
    .where(and(eq(leads.id, id), isNull(leads.consentConfirmedAt)));
}
