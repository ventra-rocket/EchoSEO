/**
 * Data access for periodic report subscriptions and the send ledger that keeps
 * a subscriber from receiving the same report twice.
 *
 * Timestamp discipline: every value written here is a full ISO 8601 string.
 * Column defaults render D1's `current_timestamp` shape (`YYYY-MM-DD HH:MM:SS`),
 * which does NOT compare as a string against ISO (`' '` sorts below `'T'`, so an
 * ISO value always looks later). `countSentSince` is safe precisely because
 * `sent_at` is only ever written by this module, in ISO, and compared against an
 * ISO bound. Never add a window query over a defaulted column.
 */
import { and, count, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { reportSends, reportSubscriptions } from "@/db/schema";

export type ReportSubscription = typeof reportSubscriptions.$inferSelect;
type ReportSend = typeof reportSends.$inferSelect;
type ReportSendKind = "weekly" | "alert";

async function getByTargetId(
  targetId: string,
): Promise<ReportSubscription | null> {
  const row = await db.query.reportSubscriptions.findFirst({
    where: eq(reportSubscriptions.targetId, targetId),
  });
  return row ?? null;
}

async function getByUnsubscribeToken(
  token: string,
): Promise<ReportSubscription | null> {
  const row = await db.query.reportSubscriptions.findFirst({
    where: eq(reportSubscriptions.unsubscribeToken, token),
  });
  return row ?? null;
}

/**
 * Create or update the single subscription for a target. Rotates nothing:
 * an existing unsubscribeToken is preserved so live links keep working.
 *
 * One statement, resolved by the unique (target_id) index, so two concurrent
 * saves converge on one row instead of racing to insert a duplicate that would
 * double every weekly email.
 *
 * An upsert is the owner deliberately (re)configuring delivery, so it re-arms a
 * subscription that was switched off or opted out. That is the only way back
 * from a one-click unsubscribe; without it a mis-click would silence the target
 * permanently with no path in the product to undo it.
 */
async function upsert(input: {
  targetId: string;
  projectId: string;
  organizationId: string;
  recipientEmail: string;
  locale: "en" | "vi";
  ownerUserId: string;
  ownerEmail: string;
  maxPages?: number;
}): Promise<ReportSubscription> {
  const nowIso = new Date().toISOString();
  const [row] = await db
    .insert(reportSubscriptions)
    .values({
      id: crypto.randomUUID(),
      targetId: input.targetId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      recipientEmail: input.recipientEmail,
      locale: input.locale,
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail,
      ...(input.maxPages === undefined ? {} : { maxPages: input.maxPages }),
      unsubscribeToken: crypto.randomUUID(),
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: [reportSubscriptions.targetId],
      // `unsubscribeToken`, `id` and `createdAt` are absent on purpose: the row
      // keeps its identity and its already-mailed unsubscribe links.
      set: {
        projectId: input.projectId,
        organizationId: input.organizationId,
        recipientEmail: input.recipientEmail,
        locale: input.locale,
        ownerUserId: input.ownerUserId,
        ownerEmail: input.ownerEmail,
        // Omitting maxPages from the insert falls back to the column default,
        // but in an update it would have to be spelled out, so an unspecified
        // value must leave whatever the target already had in place.
        ...(input.maxPages === undefined ? {} : { maxPages: input.maxPages }),
        enabled: true,
        unsubscribedAt: null,
        updatedAt: nowIso,
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to upsert report subscription");
  }
  return row;
}

/**
 * Pause or resume from inside the app.
 *
 * Resuming will not touch a row whose `unsubscribedAt` is set. A footer
 * one-click opt-out is the recipient's decision, and Gmail's and Yahoo's
 * bulk-sender rules require it to stick — an admin pressing "resume" must not
 * silently put that address back on the list. `upsert` is the documented way
 * back, because it means someone deliberately re-entered the address.
 *
 * Returns null when nothing was updated, which is either "no subscription" or
 * "this one opted out"; the caller distinguishes them, since only the second
 * has anything to explain to the user.
 */
async function setEnabled(
  targetId: string,
  enabled: boolean,
): Promise<ReportSubscription | null> {
  const [row] = await db
    .update(reportSubscriptions)
    .set({ enabled, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(reportSubscriptions.targetId, targetId),
        enabled ? isNull(reportSubscriptions.unsubscribedAt) : undefined,
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * One-click unsubscribe. Idempotent: an already-unsubscribed token still
 * resolves, so a mail client retrying the POST never 404s the user.
 *
 * `unsubscribedAt` is coalesced rather than overwritten — the column records
 * when consent was actually withdrawn, and a retry hours later must not rewrite
 * that evidence.
 */
async function markUnsubscribed(
  token: string,
): Promise<ReportSubscription | null> {
  const nowIso = new Date().toISOString();
  const [row] = await db
    .update(reportSubscriptions)
    .set({
      enabled: false,
      unsubscribedAt: sql`coalesce(${reportSubscriptions.unsubscribedAt}, ${nowIso})`,
      updatedAt: nowIso,
    })
    .where(eq(reportSubscriptions.unsubscribeToken, token))
    .returning();
  return row ?? null;
}

/**
 * Stamp the last successful delivery. Informational only — this column must
 * never be used to decide whether a period was already sent, because a failed
 * send leaves it stale while `report_sends` still holds the truth.
 */
async function recordSent(
  subscriptionId: string,
  sentAtIso: string,
): Promise<void> {
  await db
    .update(reportSubscriptions)
    .set({ lastSentAt: sentAtIso, updatedAt: new Date().toISOString() })
    .where(eq(reportSubscriptions.id, subscriptionId));
}

export const ReportSubscriptionRepository = {
  getByTargetId,
  getByUnsubscribeToken,
  upsert,
  setEnabled,
  markUnsubscribed,
  recordSent,
} as const;

/**
 * Compare-and-swap claim on (subscriptionId, kind, periodKey). Returns the
 * claimed row, or null when another run already owns this period. Claim
 * happens before any work so two overlapping runs cannot both crawl+mail.
 *
 * Deliberately a single insert: a read-then-write would leave a window in which
 * the DO alarm and a manual trigger both see "nothing sent yet" and proceed.
 */
async function tryClaim(input: {
  subscriptionId: string;
  kind: ReportSendKind;
  periodKey: string;
}): Promise<ReportSend | null> {
  const [row] = await db
    .insert(reportSends)
    .values({
      id: crypto.randomUUID(),
      subscriptionId: input.subscriptionId,
      kind: input.kind,
      periodKey: input.periodKey,
      claimedAt: new Date().toISOString(),
    })
    .onConflictDoNothing({
      target: [
        reportSends.subscriptionId,
        reportSends.kind,
        reportSends.periodKey,
      ],
    })
    .returning();
  return row ?? null;
}

/** Record which crawl this send ended up reporting on, once it has been launched. */
async function attachAudit(sendId: string, auditId: string): Promise<void> {
  await db
    .update(reportSends)
    .set({ auditId })
    .where(eq(reportSends.id, sendId));
}

async function markSent(sendId: string, sentAtIso: string): Promise<void> {
  await db
    .update(reportSends)
    .set({ sentAt: sentAtIso })
    .where(eq(reportSends.id, sendId));
}

/**
 * Give the period back so a later run can retry. Deletes the claim row.
 *
 * Deleting rather than flagging keeps the unique index free for the retry; a
 * tombstone would keep blocking the very period it is meant to reopen.
 */
async function release(sendId: string): Promise<void> {
  await db.delete(reportSends).where(eq(reportSends.id, sendId));
}

async function getById(sendId: string): Promise<ReportSend | null> {
  const row = await db.query.reportSends.findFirst({
    where: eq(reportSends.id, sendId),
  });
  return row ?? null;
}

/**
 * How many alerts actually went out for this subscription since `sinceIso`.
 * Drives the 1-alert-per-day-per-target cap.
 *
 * Counts delivered sends only: an outstanding claim is work in flight, and
 * counting it would let one crashed attempt spend the whole daily budget.
 */
async function countSentSince(
  subscriptionId: string,
  kind: ReportSendKind,
  sinceIso: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(reportSends)
    .where(
      and(
        eq(reportSends.subscriptionId, subscriptionId),
        eq(reportSends.kind, kind),
        isNotNull(reportSends.sentAt),
        gte(reportSends.sentAt, sinceIso),
      ),
    );
  return row?.value ?? 0;
}

export const ReportSendRepository = {
  tryClaim,
  attachAudit,
  markSent,
  release,
  getById,
  countSentSince,
} as const;
