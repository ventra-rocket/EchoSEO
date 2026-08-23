/**
 * Filtered reads over a crawl's stored page facts.
 *
 * Beside `AuditService` rather than inside it for the same reason
 * `audit-page-queries.ts` sits beside `AuditRepository`: that file is the shared
 * audit service and has a 400-line ceiling, so a read with a single caller lives
 * next to it. `AuditService.getResults` stays the whole-crawl read the results
 * view renders; this is the one that answers a question about the page set.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import type { AuditPageFacts } from "@/server/features/audit/repositories/audit-page-queries";
import { AppError } from "@/server/lib/errors";

/** Matches the issue-occurrence page cap, for the same reason: one read must
 *  never be able to pull an unbounded slice of a 5,000-page crawl. */
const MAX_PAGE_LIST_SIZE = 100;

/** One filtered, capped page of a crawl's stored page facts. */
interface AuditPageListing {
  audit: { id: string; startUrl: string; status: string };
  pages: AuditPageFacts[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * One filtered, capped page of the crawl's page facts.
 *
 * The project check is the same one every other audit read relies on, and it
 * runs FIRST: an audit outside the caller's project is a NOT_FOUND before a
 * single page row is touched, so a guessed audit id cannot leak another
 * workspace's crawl.
 */
export async function listAuditPages(input: {
  auditId: string;
  projectId: string;
  statusCode?: number;
  indexable?: boolean;
  inSitemap?: boolean;
  isHtml?: boolean;
  urlContains?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditPageListing> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE_LIST_SIZE);
  const offset = Math.max(input.offset ?? 0, 0);
  const { rows, total } = await AuditRepository.listPagesForAudit(
    {
      auditId: input.auditId,
      statusCode: input.statusCode,
      indexable: input.indexable,
      inSitemap: input.inSitemap,
      isHtml: input.isHtml,
      urlContains: input.urlContains,
    },
    { limit, offset },
  );

  return {
    audit: { id: audit.id, startUrl: audit.startUrl, status: audit.status },
    pages: rows,
    total,
    limit,
    offset,
  };
}
