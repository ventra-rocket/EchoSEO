import type { common as en } from "../en/common";

// Strings in shared components under `src/client/components/`. They live here
// rather than being passed in as props with English defaults: a default is what
// lets a caller silently forget and ship English into a Vietnamese page, which
// is the failure this catalog exists to make impossible. A shared component that
// reads its own ids is correct for every feature at once, including the ones
// written after it.
export const common: Record<keyof typeof en, string> = {
  "common.table.bulkActions": "Thao tác hàng loạt",
  "common.table.clearSelection": "Bỏ chọn",
  "common.table.export": "Xuất",
  "common.table.sortBy": "Sắp xếp theo {label}",
};
