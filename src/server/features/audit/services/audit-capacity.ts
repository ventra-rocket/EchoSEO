import type { LighthouseStrategy } from "@/server/lib/audit/types";

export const MAX_USER_AUDIT_USAGE = 100_000;
export const MAX_AUDIT_PAGES = 5_000;

// Ceiling is a memory guard: the crawl holds every page's result in memory
// (allPages) for the whole run, plus the finalize link-edge graph, so an
// unbounded crawl can OOM the 128MB isolate. 5,000 measures to ~60-80MB peak
// (heap ~6-9KB/page, not the serialized size) — safe headroom; 10,000 stacks
// past the limit. Raising further needs the persist-per-batch redesign (backlog).
export function clampAuditMaxPages(maxPages?: number) {
  return Math.min(Math.max(maxPages ?? 50, 10), MAX_AUDIT_PAGES);
}

export function getEstimatedAuditCapacity(input: {
  maxPages?: number;
  lighthouseStrategy?: LighthouseStrategy;
}) {
  const pagesTotal = clampAuditMaxPages(input.maxPages);
  const lighthouseStrategy = input.lighthouseStrategy ?? "auto";

  let lighthouseChecks = 0;
  switch (lighthouseStrategy) {
    case "all":
      lighthouseChecks = pagesTotal * 2;
      break;
    case "auto":
      lighthouseChecks = 20;
      break;
    case "manual":
    case "none":
      lighthouseChecks = 0;
      break;
  }

  return {
    pagesTotal,
    lighthouseTotal: lighthouseChecks,
    total: pagesTotal + lighthouseChecks,
  };
}
