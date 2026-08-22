import type { projectsSettings as en } from "../en/projectsSettings";

// Project list, create/rename/archive flows and the workspace settings route. See en/projectsSettings.ts for scope.
export const projectsSettings: Record<keyof typeof en, string> = {
  "projectsSettings.page.title": "Dự án",
  "projectsSettings.page.subtitle":
    "Mỗi dự án là một workspace riêng với Search Console, theo dõi thứ hạng và kiểm tra website của riêng nó.",
  "projectsSettings.newProject.action": "Dự án mới",

  "projectsSettings.archived.heading": "Đã lưu trữ",
  "projectsSettings.archived.noDomain": "Chưa đặt tên miền",
  "projectsSettings.archived.restore": "Khôi phục",
  "projectsSettings.archived.restoreSuccess": "Đã khôi phục dự án",
  "projectsSettings.archived.restoreError": "Không thể khôi phục dự án",

  "projectsSettings.createProject.hint":
    "Bạn có thể kết nối Search Console và thiết lập theo dõi thứ hạng sau khi tạo dự án.",
  "projectsSettings.createProject.submit": "Tạo dự án",
  "projectsSettings.createProject.success": "Đã tạo dự án",
  "projectsSettings.createProject.error": "Không thể tạo dự án",

  "projectsSettings.field.name": "Tên",
  "projectsSettings.field.namePlaceholder": "Acme Inc.",
  "projectsSettings.field.domain": "Tên miền",
  "projectsSettings.field.domainOptional": "(không bắt buộc)",
  "projectsSettings.field.domainPlaceholder": "example.com",

  "projectsSettings.validation.nameRequired": "Vui lòng nhập tên dự án.",
  "projectsSettings.action.cancel": "Hủy",

  "projectsSettings.route.heading": "Cài đặt dự án",
  "projectsSettings.section.searchConsole": "Search Console",
  "projectsSettings.section.general": "Chung",
  "projectsSettings.general.save": "Lưu thay đổi",
  "projectsSettings.general.updateSuccess": "Đã cập nhật dự án",
  "projectsSettings.general.updateError": "Không thể cập nhật dự án",

  "projectsSettings.danger.title": "Lưu trữ dự án",
  "projectsSettings.danger.canArchiveHint":
    "Lưu trữ dự án này để loại bỏ nó khỏi workspace của bạn.",
  "projectsSettings.danger.cannotArchiveHint":
    "Bạn không thể lưu trữ dự án duy nhất của mình.",
  "projectsSettings.danger.confirmBody":
    "Lưu trữ <b>{name}</b> sẽ loại dự án này khỏi workspace của bạn và dừng việc theo dõi thứ hạng theo lịch. Bạn có thể khôi phục lại sau đó từ trang Dự án.",
  "projectsSettings.danger.confirmButton": "Có, lưu trữ dự án",
  "projectsSettings.danger.archiveSuccess": "Đã lưu trữ dự án",
  "projectsSettings.danger.archiveError": "Không thể lưu trữ dự án",

  "projectsSettings.settings.appearance": "Diện mạo",
  "projectsSettings.settings.analytics": "Phân tích",
  "projectsSettings.settings.analyticsPitch": "Giúp cải thiện EchoSEO",
  "projectsSettings.settings.analyticsDescription":
    "Chia sẻ dữ liệu phân tích và sử dụng.",
  "projectsSettings.settings.analyticsToggleAria": "Bật phân tích sản phẩm",
  "projectsSettings.settings.analyticsUpdateError":
    "Không thể cập nhật cài đặt phân tích của bạn.",
  "projectsSettings.settings.analyticsEnabledToast": "Đã bật phân tích",
  "projectsSettings.settings.analyticsDisabledToast": "Đã tắt phân tích",
};
