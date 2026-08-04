import type { LiteReport } from "@/server/services/seo-check/types";
import type { Locale } from "@/client/i18n/config";

/**
 * What the shared `/c/{id}` page renders from — the same shape the check-read
 * endpoint answers, so a seeded view and a fetched view are interchangeable.
 */
export interface CheckView {
  report: LiteReport;
  locale: Locale;
  createdAt: string;
  /** Fresh per read — the Deep kill-switch can flip after the snapshot froze. */
  deepAvailable: boolean;
}

// A one-shot hand-off between the landing and the shared page. A successful
// check leaves the landing holding the full report, then changes the address
// bar to `/c/{id}` — which navigates the router to `/c/$id` (TanStack patches
// history, so even a raw `replaceState` is a navigation). Without this seed that
// page would re-fetch the report the landing already has and flash its own
// "loading…" between the scan skeleton and the result — the lag a successful
// check ends on. Keyed by id and dropped on read, so a refresh or a forwarded
// link still fetches the authoritative snapshot.
const pending = new Map<string, CheckView>();

/** Called by the landing right before it swaps the URL to `/c/{id}`. */
export function seedCheckView(id: string, view: CheckView): void {
  pending.set(id, view);
}

/** Read without consuming — for a render-time initial state that stays pure. */
export function peekCheckView(id: string): CheckView | undefined {
  return pending.get(id);
}

/** Read and consume — the shared page takes the seed once, then falls through
 * to the network on any later mount for the same id. */
export function takeCheckView(id: string): CheckView | undefined {
  const view = pending.get(id);
  pending.delete(id);
  return view;
}
