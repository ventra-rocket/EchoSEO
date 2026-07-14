/**
 * D1 access for the Deep check `(domain, day)` dedupe reservation.
 *
 * `reserveDomainDay` is atomic via the table's primary key: the first writer for
 * a `(domain, day)` inserts and wins; a concurrent writer's insert is ignored on
 * the PK conflict and reads back the winner's report id so it can attach.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deepCheckDedupe } from "@/db/schema";

interface Reservation {
  /** True if this caller became the canonical audit for the (domain, day). */
  won: boolean;
  /** The canonical report id — this caller's own id when it won. */
  canonicalReportId: string;
}

export async function reserveDomainDay(
  domainDay: string,
  reportId: string,
): Promise<Reservation> {
  // Retry guards a microscopic race: the winner releasing between our conflicted
  // insert and the read-back. Two passes is enough; the final fallback claims
  // canonical (a bounded second audit is safer than stranding the report).
  for (let attempt = 0; attempt < 2; attempt++) {
    const inserted = await db
      .insert(deepCheckDedupe)
      .values({ domainDay, reportId })
      .onConflictDoNothing()
      .returning({ reportId: deepCheckDedupe.reportId });
    if (inserted.length === 1) {
      return { won: true, canonicalReportId: reportId };
    }

    const [row] = await db
      .select({ reportId: deepCheckDedupe.reportId })
      .from(deepCheckDedupe)
      .where(eq(deepCheckDedupe.domainDay, domainDay))
      .limit(1);
    if (row) {
      return { won: false, canonicalReportId: row.reportId };
    }
  }
  return { won: true, canonicalReportId: reportId };
}

/**
 * Frees a reservation. Scoped to the holding report id so a losing confirm can
 * never release the winner's slot.
 */
export async function releaseDomainDay(
  domainDay: string,
  reportId: string,
): Promise<void> {
  await db
    .delete(deepCheckDedupe)
    .where(
      and(
        eq(deepCheckDedupe.domainDay, domainDay),
        eq(deepCheckDedupe.reportId, reportId),
      ),
    );
}
