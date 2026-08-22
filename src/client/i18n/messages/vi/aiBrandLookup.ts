import type { aiBrandLookup as en } from "../en/aiBrandLookup";

// Brand Lookup shell: search card, results header, share-of-voice, mention trend and search history. See en/aiBrandLookup.ts for scope.
//
// "Share of Voice" stays untranslated: an SEO metric term with no single
// standard Vietnamese rendering, matching how CPC/CTR stay English elsewhere
// in this app's Vietnamese copy. DataForSEO, ChatGPT and Google AI Overview
// stay untranslated per the shipped brand/product-noun list.
export const aiBrandLookup: Record<keyof typeof en, string> = {
  "aiBrandLookup.page.subtitle":
    "Xem cách tìm kiếm AI đề cập đến bất kỳ tên thương hiệu hoặc tên miền nào.",

  "aiBrandLookup.gate.description":
    "Xem cách ChatGPT và Google AI Overview đề cập đến bất kỳ thương hiệu hoặc tên miền nào — tổng số lượt đề cập, các prompt mẫu có xuất hiện, và các trang được trích dẫn cùng.",
  "aiBrandLookup.gate.bullet.visibility.title": "Theo dõi độ hiện diện AI",
  "aiBrandLookup.gate.bullet.visibility.body":
    "Xem số lượt ước tính các câu trả lời của ChatGPT và Google AI Overview có đề cập đến thương hiệu của bạn, và theo dõi xu hướng theo từng tháng.",
  "aiBrandLookup.gate.bullet.prompts.title": "Xem các prompt",
  "aiBrandLookup.gate.bullet.prompts.body":
    "Xem các câu hỏi mẫu của người dùng mà LLM có nhắc đến thương hiệu hoặc tên miền của bạn.",
  "aiBrandLookup.gate.bullet.competitors.title":
    "Lập bản đồ đối thủ cạnh tranh",
  "aiBrandLookup.gate.bullet.competitors.body":
    "Phát hiện các trang mà LLM trích dẫn cùng với bạn để biết ai đang cạnh tranh sự chú ý trong các câu trả lời AI.",

  "aiBrandLookup.search.queryPlaceholder": "Nhập tên thương hiệu hoặc tên miền",
  "aiBrandLookup.search.competitorsPlaceholder":
    "Thêm đối thủ cạnh tranh (cách nhau bằng dấu phẩy)",
  "aiBrandLookup.search.competitorsAriaLabel": "Đối thủ cạnh tranh",
  "aiBrandLookup.search.competitorsHelp":
    "Thêm tối đa 5 thương hiệu hoặc tên miền đối thủ để xem Share of Voice của bạn.",
  "aiBrandLookup.search.submit": "Tra cứu",
  "aiBrandLookup.search.submitLoading": "Đang tra cứu…",
  "aiBrandLookup.search.costEstimate": "Ước tính {amount}",
  "aiBrandLookup.search.costEstimateCompetitors":
    "cộng thêm ~{amount} để so sánh với đối thủ cạnh tranh",
  "aiBrandLookup.search.error.queryRequired":
    "Vui lòng nhập tên thương hiệu hoặc tên miền",
  "aiBrandLookup.search.error.queryTooLong":
    "Giới hạn dưới {max, number} ký tự",
  "aiBrandLookup.search.error.competitorTooLong":
    "Mỗi đối thủ cạnh tranh phải dưới {max, number} ký tự",
  "aiBrandLookup.search.error.competitorMatchesTarget":
    "“{competitor}” trùng với thương hiệu bạn đang tra cứu — hãy xóa khỏi danh sách đối thủ cạnh tranh",

  "aiBrandLookup.results.lookupError":
    "Không thể hoàn tất lượt tra cứu này. Vui lòng thử lại.",
  "aiBrandLookup.results.recentSearches": "Tìm kiếm gần đây",
  "aiBrandLookup.results.allPlatformsUnavailable":
    "Dữ liệu lượt đề cập AI hiện tạm thời không khả dụng cho {target}. Vui lòng thử lại sau ít phút.",
  "aiBrandLookup.results.noMentionsFound":
    "Không tìm thấy lượt đề cập AI nào cho {target}.",
  "aiBrandLookup.results.platformsUnavailableNote":
    "Lưu ý: {platforms} hiện không khả dụng — một số lượt đề cập có thể bị thiếu.",
  "aiBrandLookup.results.targetType.domain": "Tên miền",
  "aiBrandLookup.results.targetType.keyword": "Từ khóa",
  "aiBrandLookup.results.updated": "Cập nhật {relative}",
  "aiBrandLookup.results.updatedFallback": "gần đây",
  "aiBrandLookup.results.stat.mentions.label": "Lượt đề cập",
  "aiBrandLookup.results.stat.mentions.tooltip":
    "Số lượt ước tính các câu trả lời AI có thương hiệu hoặc tên miền được tìm kiếm xuất hiện trong nội dung trả lời hoặc nguồn trích dẫn.",
  "aiBrandLookup.results.stat.aiSearchVolume.label": "Lượng tìm kiếm AI",
  "aiBrandLookup.results.stat.aiSearchVolume.tooltip":
    "Nhu cầu tìm kiếm hàng tháng ước tính cho các prompt mà thương hiệu hoặc tên miền được tìm kiếm xuất hiện trong câu trả lời AI. Đây là nhu cầu prompt, không phải số lượt đề cập.",
  "aiBrandLookup.results.chatGptCountryTooltip":
    "DataForSEO chỉ lập chỉ mục lượt đề cập ChatGPT cho tiếng Anh (Mỹ) — không thể chọn quốc gia cho nền tảng này.",
  "aiBrandLookup.results.platformUnavailable": "không khả dụng",
  "aiBrandLookup.results.mentionTrend.title":
    "Xu hướng lượt đề cập (12 tháng gần nhất)",

  "aiBrandLookup.shareOfVoice.title": "Share of Voice",
  "aiBrandLookup.shareOfVoice.noComparableData":
    "· không có dữ liệu để so sánh",
  "aiBrandLookup.shareOfVoice.targetShare": "· {percent}",
  "aiBrandLookup.shareOfVoice.footer":
    "Tỷ lệ lượt đề cập trên {platforms} · thanh biểu diễn theo tỷ lệ với người dẫn đầu.",
  "aiBrandLookup.shareOfVoice.youBadge": "Bạn",

  "aiBrandLookup.mentionTrend.empty": "Chưa đủ dữ liệu lịch sử.",
  "aiBrandLookup.mentionTrend.tooltip":
    "{count, plural, other {# lượt đề cập}}",

  "aiBrandLookup.history.emptyMessage":
    "Tìm kiếm tên thương hiệu hoặc tên miền để xem AI đề cập đến nó như thế nào",
  "aiBrandLookup.history.competitorsPrefix": "so với {competitors}",
  "aiBrandLookup.history.noun": "tra cứu",
} as const;
