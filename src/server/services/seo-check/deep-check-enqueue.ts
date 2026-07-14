/**
 * Seam between a confirmed opt-in and the Deep audit run.
 *
 * Slice 1 stub: it only records that the report is queued. Slice 2 replaces the
 * body with the DeepSeoCheckWorkflow enqueue plus the DO concurrency/quota gate
 * and the (domain, day) dedupe reservation. Isolating it here means the confirm
 * handler and its tests do not change when the real workflow lands.
 */
export async function enqueueDeepCheck(reportId: string): Promise<void> {
  console.info(
    `[free-seo-check] deep check queued: report ${reportId} (workflow wiring is Slice 2)`,
  );
}
