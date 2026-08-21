import type { savedModals as en } from "../en/savedModals";

// Saved Keywords: header, bulk-tags modal, tag management rows and their confirmations.
export const savedModals: Record<keyof typeof en, string> = {
  "saved.header.subtitle":
    "Lưu ý tưởng từ khóa từ quá trình nghiên cứu, sắp xếp bằng thẻ và quay lại khi bạn sẵn sàng hành động.",
  "saved.header.actionsMenu.trigger": "Thao tác",
  "saved.header.actionsMenu.updating": "Đang cập nhật...",
  "saved.header.actionsMenu.updateStats": "Cập nhật số liệu từ khóa",
  "saved.header.actionsMenu.updateStatsHint": "Lượng tìm kiếm, độ khó & CPC",

  "saved.bulkTagsModal.title": "Cập nhật thẻ",
  "saved.bulkTagsModal.subtitle":
    "Áp dụng hoặc gỡ thẻ trên {count, plural, other {# từ khóa đã chọn}}.",
  "saved.bulkTagsModal.addTagsTab": "Thêm thẻ",
  "saved.bulkTagsModal.removeTagsTab": "Gỡ thẻ",
  "saved.bulkTagsModal.removeFromSelectionTitle": "Bỏ khỏi lựa chọn",
  "saved.bulkTagsModal.searchPlaceholder": "Tìm hoặc tạo…",
  "saved.bulkTagsModal.createLabel": "Tạo",
  "saved.bulkTagsModal.createQuery": "“{query}”",
  "saved.bulkTagsModal.emptyNoTags":
    "Chưa có thẻ nào. Nhập tên ở trên để tạo thẻ mới.",
  "saved.bulkTagsModal.emptyNoMatches":
    "Không có thẻ nào khớp với tìm kiếm đó.",
  "saved.bulkTagsModal.removeEmpty":
    "Các từ khóa đã chọn không có thẻ nào để gỡ.",
  "saved.bulkTagsModal.willBeRemovedTitle": "Sẽ được gỡ",
  "saved.bulkTagsModal.clickToRemoveTitle": "Nhấp để gỡ",
  "saved.bulkTagsModal.removeSummary":
    "{count, plural, other {# thẻ}} sẽ được gỡ khỏi các từ khóa đã chọn.",
  "saved.bulkTagsModal.cancel": "Hủy",
  "saved.bulkTagsModal.apply": "Áp dụng",

  "saved.tagManage.updateSuccessToast": "Đã cập nhật thẻ",
  "saved.tagManage.updateErrorFallback": "Không thể cập nhật thẻ",
  "saved.tagManage.deleteSuccessToast": "Đã xóa thẻ",
  "saved.tagManage.deleteErrorFallback":
    "Không thể xóa thẻ. Hãy gỡ thẻ khỏi tất cả từ khóa rồi thử lại.",

  "saved.tagManage.row.renameLabel": "Đổi tên",
  "saved.tagManage.row.colorLabel": "Màu",
  "saved.tagManage.row.color.slate": "Xám",
  "saved.tagManage.row.color.rose": "Hồng",
  "saved.tagManage.row.color.amber": "Hổ phách",
  "saved.tagManage.row.color.lime": "Xanh chanh",
  "saved.tagManage.row.color.emerald": "Xanh lục bảo",
  "saved.tagManage.row.color.sky": "Xanh da trời",
  "saved.tagManage.row.color.violet": "Tím",
  "saved.tagManage.row.color.fuchsia": "Hồng cánh sen",
  "saved.tagManage.row.delete": "Xóa",
  "saved.tagManage.row.cancel": "Hủy",
  "saved.tagManage.row.save": "Lưu",

  "saved.deleteModal.title": "Xóa từ khóa?",
  "saved.deleteModal.body":
    "Thao tác này sẽ xóa vĩnh viễn {count, plural, other {# từ khóa đã lưu}}.",
  "saved.deleteModal.cancel": "Hủy",
  "saved.deleteModal.confirm": "Xóa {count, plural, other {# từ khóa}}",
};
