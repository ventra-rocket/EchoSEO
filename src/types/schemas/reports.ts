import { z } from "zod";

/**
 * Server-function input schemas for periodic reports.
 *
 * The recipient address is deliberately free-form rather than pinned to the
 * caller's account: teams route these to a shared inbox or to the client whose
 * site it is. That is also why the subscription carries its own unsubscribe
 * token — the person who receives the mail may have no account here at all.
 */

export const getReportSubscriptionSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

export const saveReportSubscriptionSchema = z.object({
  projectId: z.string().min(1),
  /** Resolves the target; the caller never names a target id directly. */
  auditId: z.string().min(1),
  recipientEmail: z.string().email().max(320),
  locale: z.enum(["en", "vi"]).default("en"),
  /**
   * Crawl size for the scheduled run. Capped at the hosted verification
   * threshold: above it a launch needs a verified domain, and a weekly job that
   * silently starts failing that gate is worse than a smaller crawl.
   */
  maxPages: z.number().int().min(10).max(100).optional(),
});

export const setReportSubscriptionEnabledSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  enabled: z.boolean(),
});
