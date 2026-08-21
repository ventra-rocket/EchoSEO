// Strings in shared components under `src/client/components/`. They live here
// rather than being passed in as props with English defaults: a default is what
// lets a caller silently forget and ship English into a Vietnamese page, which
// is the failure this catalog exists to make impossible. A shared component that
// reads its own ids is correct for every feature at once, including the ones
// written after it.
export const common = {
  "common.table.bulkActions": "Bulk actions",
  "common.table.clearSelection": "Clear selection",
  "common.table.export": "Export",
} as const;
