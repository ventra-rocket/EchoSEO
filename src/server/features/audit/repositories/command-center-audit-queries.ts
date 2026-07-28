import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits } from "@/db/schema";

export async function getLatestAuditByProject(projectId: string) {
  const rows = await db
    .select()
    .from(audits)
    .where(eq(audits.projectId, projectId))
    .orderBy(desc(audits.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAuditsByProject(projectId: string) {
  const rows = await db
    .select({ audit: audits })
    .from(audits)
    .where(eq(audits.projectId, projectId))
    .orderBy(desc(audits.startedAt));
  return rows.map(({ audit }) => audit);
}

export async function getLatestCompletedAuditByProject(projectId: string) {
  const rows = await db
    .select()
    .from(audits)
    .where(and(eq(audits.projectId, projectId), eq(audits.status, "completed")))
    .orderBy(desc(audits.completedAt))
    .limit(1);
  return rows[0] ?? null;
}
