/**
 * Vietnamese text of the Terms and the Privacy Policy.
 *
 * This module mirrors `legal-content.ts` — same sections in the same order,
 * same block kinds, same list items and definition entries — and a parity test
 * asserts that structure. Two legal texts that drift apart are a real
 * liability, so any change to a commitment lands in the English source first
 * and is mirrored here in the same change, never in one language alone.
 *
 * Every factual claim (retention windows, the read-only Search Console grant,
 * the sub-processor list, double opt-in, the minimum age, the free/no-payment
 * position, governing law) is a translation of the verified English claim, not
 * a restatement from memory. Product terms the Vietnamese UI keeps in English
 * — workspace, audit, property, hostname — stay in English here too, so the
 * legal pages describe the same interface the reader is using.
 */
import { LEGAL_CONTACT_EMAIL } from "@/shared/legal";
import type { LegalDocument } from "./legal-content";

/** Mirrors `SERVICE_DESCRIPTION` in the English module. */
const SERVICE_DESCRIPTION_VI =
  "EchoSEO là một dịch vụ phân tích SEO. Dịch vụ gồm một công cụ kiểm tra ẩn danh chấm điểm một trang công khai duy nhất, và một workspace dành cho người đã đăng nhập: quét website bạn kiểm soát, báo cáo các vấn đề tìm thấy, và có thể đọc dữ liệu Google Search Console của bạn.";

export const TERMS_DOCUMENT_VI: LegalDocument = {
  title: "Điều khoản và Điều kiện",
  summary:
    "Thỏa thuận giữa bạn và EchoSEO khi bạn sử dụng dịch vụ do chúng tôi vận hành tại echoseo.ventrarocket.vn.",
  sections: [
    {
      heading: "Chúng tôi là ai",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO là một dự án do VentraRocket vận hành từ Việt Nam. Các Điều khoản này điều chỉnh việc bạn sử dụng dịch vụ tại echoseo.ventrarocket.vn. Bằng việc tạo tài khoản hoặc gửi một lượt kiểm tra, bạn chấp nhận các Điều khoản này.",
        },
        {
          kind: "paragraph",
          text: "Phần mềm EchoSEO là mã nguồn mở theo giấy phép MIT. Các Điều khoản này chỉ áp dụng cho dịch vụ do chính chúng tôi vận hành. Nếu bạn hoặc người khác tự triển khai (self-host) EchoSEO, bản triển khai đó thuộc trách nhiệm của người vận hành nó, và thỏa thuận này không áp dụng cho bản đó.",
        },
      ],
    },
    {
      heading: "Dịch vụ này làm gì",
      blocks: [
        { kind: "paragraph", text: SERVICE_DESCRIPTION_VI },
        {
          kind: "paragraph",
          text: "EchoSEO báo cáo những gì nó quan sát được và đề xuất thay đổi. Nó không kiểm soát các công cụ tìm kiếm. Không nội dung nào ở đây là lời hứa về bất kỳ thứ hạng, mức lưu lượng truy cập hay kết quả lập chỉ mục nào, và không phần nào của dịch vụ nên được hiểu là tư vấn pháp lý, tài chính hay tư vấn chuyên môn.",
        },
      ],
    },
    {
      heading: "Tài khoản của bạn",
      blocks: [
        {
          kind: "list",
          items: [
            "Bạn phải cung cấp một địa chỉ email bạn thực sự kiểm soát, và giữ an toàn thông tin đăng nhập của mình.",
            "Bạn chịu trách nhiệm cho mọi việc được thực hiện dưới tài khoản của mình, kể cả bởi những người bạn mời vào workspace.",
            "Chủ workspace có thể xem và quản lý các dự án, các audit và thành viên trong workspace đó. Chỉ mời những người bạn thật sự muốn trao quyền truy cập đó.",
            "Bạn phải đủ 16 tuổi trở lên để tạo tài khoản.",
          ],
        },
      ],
    },
    {
      heading: "Sử dụng được chấp nhận",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO truy xuất các trang trên web theo lệnh của bạn. Chính khả năng đó là phần dễ bị lạm dụng nhất, nên những giới hạn dưới đây là nghiêm ngặt.",
        },
        {
          kind: "list",
          items: [
            "Chỉ chạy audit trên website bạn sở hữu hoặc được ủy quyền phân tích. Xác minh qua Search Console là cách dịch vụ kiểm chứng điều này cho audit, và bạn không được tìm cách lách qua bước đó.",
            "Không dùng EchoSEO để gây quá tải, làm gián đoạn hay dò quét một website bạn không kiểm soát, hoặc dùng nó làm một mắt xích trong bất kỳ cuộc tấn công nào.",
            "Không tìm cách vô hiệu hóa giới hạn tần suất, hạn mức, các bước kiểm tra bot, hay ranh giới giữa các workspace.",
            "Không dùng dịch vụ để xử lý nội dung vi phạm pháp luật, hoặc để gửi thư không được yêu cầu tới những địa chỉ không phải của bạn.",
            "Không bán lại dịch vụ do chúng tôi vận hành như thể dịch vụ của bạn. Thay vào đó, bạn hoàn toàn có thể tự triển khai phần mềm theo giấy phép MIT.",
          ],
        },
        {
          kind: "paragraph",
          text: "Chúng tôi có thể tạm ngưng tài khoản vi phạm các giới hạn này — không cần báo trước nếu hành vi lạm dụng vẫn đang diễn ra.",
        },
      ],
    },
    {
      heading: "Website và dữ liệu của bạn",
      blocks: [
        {
          kind: "paragraph",
          text: "Bạn giữ toàn bộ quyền đối với website, nội dung và dữ liệu bạn kết nối. Khi sử dụng dịch vụ, bạn cho phép chúng tôi truy xuất, lưu trữ và phân tích những tài liệu đó cho mục đích tạo báo cáo của bạn.",
        },
        {
          kind: "paragraph",
          text: "Nếu bạn kết nối Google Search Console, EchoSEO chỉ yêu cầu quyền truy cập chỉ đọc (read-only). Nó có thể đọc hiệu suất tìm kiếm và trạng thái lập chỉ mục của bạn; nó không thể gửi, thay đổi hay xóa bất cứ thứ gì trong property Search Console của bạn. Bạn có thể ngắt kết nối bất cứ lúc nào từ phần cài đặt tài khoản Google của mình.",
        },
        {
          kind: "paragraph",
          text: "Khi dịch vụ có thể tác động ra bên ngoài EchoSEO — ví dụ gửi URL của bạn tới IndexNow — nó chỉ làm vậy khi bạn yêu cầu một cách rõ ràng, và chỉ với website bạn đã chứng minh mình kiểm soát.",
        },
      ],
    },
    {
      heading: "Giá",
      blocks: [
        {
          kind: "paragraph",
          text: "Dịch vụ hiện tại miễn phí. Hôm nay chúng tôi không bán gói trả phí nào và không thu thập thông tin thanh toán. Nếu điều đó thay đổi, chúng tôi sẽ công bố các điều khoản thanh toán, gia hạn và hoàn tiền tại đây, và làm rõ chúng trước khi bất kỳ ai được yêu cầu trả tiền. Bạn sẽ không bao giờ bị thu phí theo phiên bản hiện tại của các Điều khoản này.",
        },
      ],
    },
    {
      heading: "Tính khả dụng và thay đổi",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO được cung cấp nguyên trạng (as-is) và theo mức sẵn có (as-available), không kèm cam kết nào về thời gian hoạt động. Đây là phần mềm còn non trẻ: tính năng có thể thay đổi hoặc bị gỡ bỏ, các lượt kiểm tra có thể bị giới hạn tần suất hoặc tạm dừng, và tác vụ chạy nền có thể thất bại. Chúng tôi có sao lưu nền tảng, nhưng bạn không nên coi EchoSEO là bản sao duy nhất của bất cứ thứ gì quan trọng với mình.",
        },
      ],
    },
    {
      heading: "Chấm dứt thỏa thuận",
      blocks: [
        {
          kind: "paragraph",
          text: `Bạn có thể ngừng sử dụng dịch vụ bất cứ lúc nào và yêu cầu chúng tôi xóa tài khoản bằng cách viết thư tới ${LEGAL_CONTACT_EMAIL}. Chúng tôi có thể chấm dứt hoặc tạm ngưng quyền truy cập nếu các Điều khoản này bị vi phạm, hoặc nếu chúng tôi ngừng vận hành dịch vụ này. Dữ liệu được xóa theo cách mô tả trong Chính sách quyền riêng tư.`,
        },
      ],
    },
    {
      heading: "Trách nhiệm pháp lý",
      blocks: [
        {
          kind: "paragraph",
          text: "Trong phạm vi pháp luật cho phép, EchoSEO và VentraRocket không chịu trách nhiệm cho lợi nhuận bị mất, lưu lượng truy cập bị mất, thứ hạng bị mất, dữ liệu bị mất, hay bất kỳ tổn thất gián tiếp hoặc mang tính hệ quả nào phát sinh từ việc bạn sử dụng dịch vụ. Vì dịch vụ được cung cấp không thu phí, tổng trách nhiệm của chúng tôi đối với bạn giới hạn ở việc khắc phục dịch vụ hoặc chấm dứt tài khoản của bạn. Không nội dung nào ở đây loại trừ trách nhiệm mà pháp luật không cho phép loại trừ.",
        },
      ],
    },
    {
      heading: "Thay đổi các Điều khoản này",
      blocks: [
        {
          kind: "paragraph",
          text: "Chúng tôi có thể cập nhật các Điều khoản này. Ngày ở đầu trang luôn phản ánh phiên bản hiện hành. Nếu một thay đổi làm giảm đáng kể quyền của bạn, chúng tôi sẽ thông báo qua email cho chủ tài khoản trước khi thay đổi có hiệu lực. Tiếp tục sử dụng dịch vụ sau thời điểm đó nghĩa là bạn chấp nhận phiên bản mới.",
        },
      ],
    },
    {
      heading: "Luật điều chỉnh",
      blocks: [
        {
          kind: "paragraph",
          text: "Các Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Chúng tôi muốn giải quyết vấn đề qua email hơn là qua thủ tục tố tụng, nên hãy liên hệ với chúng tôi trước.",
        },
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT_VI: LegalDocument = {
  title: "Chính sách quyền riêng tư",
  summary:
    "EchoSEO thu thập những gì khi bạn dùng dịch vụ tại echoseo.ventrarocket.vn, vì sao, dữ liệu được giữ trong bao lâu, và ai khác nhìn thấy nó.",
  sections: [
    {
      heading: "Phạm vi",
      blocks: [
        {
          kind: "paragraph",
          text: "Chính sách này áp dụng cho dịch vụ tại echoseo.ventrarocket.vn, do VentraRocket vận hành từ Việt Nam. Một bản EchoSEO tự triển khai (self-host) hoàn toàn do người vận hành nó kiểm soát; chúng tôi không nhận được gì từ bản đó và chính sách này không mô tả nó.",
        },
      ],
    },
    {
      heading: "Chúng tôi thu thập gì, và vì sao",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Thông tin tài khoản",
              description:
                "Địa chỉ email của bạn, tên của bạn nếu bạn cung cấp, và — tùy cách bạn đăng nhập — hoặc mật khẩu đã băm, hoặc hồ sơ Google cơ bản bạn dùng để đăng nhập. Thiếu chúng thì không thể có tài khoản.",
            },
            {
              term: "Thông tin workspace",
              description:
                "Tên workspace của bạn, những ai thuộc về nó, và các địa chỉ email bạn nhập để mời người khác. Một email mời sẽ được gửi tới đúng địa chỉ bạn nhập, vì vậy chỉ nhập địa chỉ của những người đang chờ lời mời đó.",
            },
            {
              term: "Website và kết quả audit",
              description:
                "Các địa chỉ website bạn thêm, các trang được quét từ đó, liên kết giữa những trang này, các vấn đề tìm thấy, và mọi ảnh chụp màn hình bằng chứng bạn yêu cầu dịch vụ ghi lại.",
            },
            {
              term: "Dữ liệu Google Search Console",
              description:
                "Nếu bạn kết nối: số liệu hiệu suất tìm kiếm và trạng thái lập chỉ mục của property bạn đã kết nối, được đọc bằng quyền chỉ đọc (read-only). Token truy cập được lưu trong cơ sở dữ liệu của chúng tôi để kết nối duy trì hoạt động, và mất hiệu lực ngay khi bạn thu hồi nó trong tài khoản Google của mình.",
            },
            {
              term: "Lượt gửi ở công cụ kiểm tra miễn phí",
              description:
                "URL bạn yêu cầu chúng tôi kiểm tra. Chỉ riêng với báo cáo chuyên sâu: thêm địa chỉ email bạn cung cấp và thời điểm bạn xác nhận. Bản kiểm tra nhanh không cần email — bộ nhớ đệm của nó được khóa theo hostname, và kết quả bạn đã xem được giữ lại dưới liên kết chia sẻ không thể đoán mà công cụ cấp cho bạn, để liên kết đó tiếp tục hoạt động.",
            },
            {
              term: "Dữ liệu kỹ thuật",
              description:
                "Nhật ký truy cập và nhật ký lỗi thông thường. Bộ đếm giới hạn tần suất được khóa theo địa chỉ IP nhưng chỉ tồn tại trong các bộ đếm trên bộ nhớ và tự hết hạn; địa chỉ IP của bạn không bao giờ được ghi vào cơ sở dữ liệu hay kho lưu tệp của chúng tôi.",
            },
          ],
        },
      ],
    },
    {
      heading: "Bản thân URL được kiểm tra cũng có thể là dữ liệu cá nhân",
      blocks: [
        {
          kind: "paragraph",
          text: "Một địa chỉ staging, không công khai hay nội bộ nói lên điều gì đó về người đã gửi nó. Vì vậy chúng tôi đối xử với các URL bạn cung cấp cẩn trọng như với chính địa chỉ email của bạn.",
        },
      ],
    },
    {
      heading: "Những điều chúng tôi không làm",
      blocks: [
        {
          kind: "list",
          items: [
            "Chúng tôi không bán hay cho thuê dữ liệu cá nhân của bạn, và chưa bao giờ làm vậy.",
            "Chúng tôi không dùng dữ liệu hay nội dung website của bạn để huấn luyện các mô hình AI.",
            "Chúng tôi không chạy trình theo dõi quảng cáo hay công cụ phân tích bên thứ ba nào trên bản triển khai này. Phần mềm có thể được cấu hình để gửi số liệu phân tích sản phẩm, và cấu hình đó đang tắt ở đây.",
          ],
        },
      ],
    },
    {
      heading: "Vì sao chúng tôi được phép lưu giữ dữ liệu",
      blocks: [
        {
          kind: "paragraph",
          text: "Với tài khoản: vì chúng tôi cần những dữ liệu đó để cung cấp dịch vụ bạn yêu cầu. Với báo cáo chuyên sâu miễn phí: dựa trên sự đồng ý của bạn — việc gửi biểu mẫu chưa khởi động điều gì, và lượt kiểm tra chỉ bắt đầu khi bạn bấm vào liên kết xác nhận chúng tôi gửi qua email. Cơ chế đồng ý hai bước (double opt-in) đó cũng chính là thứ ngăn biểu mẫu bị lợi dụng để gửi thư cho người khác.",
        },
      ],
    },
    {
      heading: "Chúng tôi giữ dữ liệu trong bao lâu",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Báo cáo chuyên sâu miễn phí và email đã yêu cầu nó",
              description:
                "30 ngày, tính từ lúc báo cáo hoàn tất chứ không phải lúc được yêu cầu. Báo cáo đang chạy không bao giờ bị xóa.",
            },
            {
              term: "Yêu cầu ở công cụ kiểm tra miễn phí chưa từng được xác nhận",
              description:
                "7 ngày sau khi liên kết xác nhận hết hạn. Liên kết có hiệu lực trong 24 giờ. Quy tắc này tồn tại để địa chỉ của những người chưa từng đồng ý không trở thành thứ chúng tôi giữ lâu nhất.",
            },
            {
              term: "Ảnh chụp màn hình của website được kiểm tra",
              description: "7 ngày kể từ lúc chụp.",
            },
            {
              term: "Liên kết chia sẻ kết quả của bản kiểm tra nhanh",
              description:
                "30 ngày kể từ lượt kiểm tra. Liên kết ngừng hoạt động khi bản chụp kết quả bị xóa; nó chỉ chứa dữ liệu công khai của trang mà kết quả hiển thị, không bao giờ chứa địa chỉ email.",
            },
            {
              term: "Ảnh chụp màn hình bằng chứng trong audit",
              description: "30 ngày kể từ lúc chụp.",
            },
            {
              term: "Tệp xuất dữ liệu audit",
              description: "7 ngày sau khi bản xuất được tạo xong.",
            },
            {
              term: "Dữ liệu quét của audit",
              description: "Mặc định 90 ngày.",
            },
            {
              term: "Hồ sơ tài khoản và workspace",
              description:
                "Cho tới khi bạn yêu cầu chúng tôi xóa. Xóa một hồ sơ sẽ kéo theo các báo cáo và tệp lưu trữ thuộc về nó.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Việc xóa chạy dưới dạng một lượt dọn dẹp hằng ngày. Mỗi lần chạy chỉ xử lý một số bản ghi nhất định, nên khối tồn đọng lớn sẽ vơi dần trong vài ngày thay vì hết ngay trong một lượt. Nếu một lượt kiểm tra bị gián đoạn nặng tới mức không bao giờ đạt trạng thái hoàn tất, nó không có hạn xóa và sẽ nằm lại cho tới khi có người yêu cầu chúng tôi gỡ bỏ — hãy viết thư cho chúng tôi và chúng tôi sẽ xóa.",
        },
      ],
    },
    {
      heading: "Ai khác nhìn thấy dữ liệu của bạn",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Cloudflare",
              description:
                "Hạ tầng máy chủ, cơ sở dữ liệu, kho lưu tệp, và bước kiểm tra chống bot trên biểu mẫu công khai. Về mặt kỹ thuật, Cloudflare thấy được mọi thứ mà dịch vụ lưu trữ.",
            },
            {
              term: "Google",
              description:
                "PageSpeed Insights nhận URL đang được kiểm tra, không bao giờ nhận email của bạn. Nếu bạn đăng nhập bằng Google hoặc kết nối Search Console, đương nhiên Google biết bạn đã làm vậy.",
            },
            {
              term: "Resend",
              description:
                "Nhận địa chỉ email của bạn và nội dung thư, để chuyển phát thư tài khoản và liên kết báo cáo.",
            },
            {
              term: "Các bên tham gia IndexNow",
              description:
                "Bing và Yandex nhận những URL bạn chủ động chọn gửi. Google không tham gia IndexNow.",
            },
            {
              term: "DataForSEO",
              description:
                "Dùng cho dữ liệu từ khóa cạnh tranh và backlink, và chỉ khi người vận hành cấu hình khóa API. Bản triển khai này chưa cấu hình khóa nào, nên hiện tại không có dữ liệu nào được chuyển tới DataForSEO.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Các nhà cung cấp này hoạt động bên ngoài Việt Nam, nên việc sử dụng dịch vụ đồng nghĩa với việc dữ liệu của bạn được xử lý ở nước ngoài. Ngoài họ ra, chúng tôi không tiết lộ dữ liệu cho bất kỳ ai khác, trừ trường hợp pháp luật yêu cầu.",
        },
      ],
    },
    {
      heading: "Cookie",
      blocks: [
        {
          kind: "paragraph",
          text: "Đăng nhập sẽ đặt một cookie phiên để bạn không bị đăng xuất; đó là toàn bộ nhiệm vụ của nó và nó không làm gì khác. Biểu mẫu kiểm tra công khai chạy một bước chống bot của Cloudflare, bước này đặt cookie ngắn hạn riêng. Không có cookie quảng cáo hay cookie theo dõi liên trang nào.",
        },
      ],
    },
    {
      heading: "Liên kết báo cáo",
      blocks: [
        {
          kind: "paragraph",
          text: "Một báo cáo chuyên sâu miễn phí nằm tại một địa chỉ chứa mã định danh dài không thể đoán được. Liên kết đó chính là chìa khóa: nó được loại khỏi các công cụ tìm kiếm và không thể đoán ra, nhưng bất kỳ ai được bạn chuyển tiếp liên kết đều mở được báo cáo mà không cần đăng nhập. Hãy giữ nó như cách bạn giữ liên kết tới một tài liệu riêng tư, và báo cho chúng tôi nếu bạn muốn thu hồi một liên kết trước hạn.",
        },
      ],
    },
    {
      heading: "Quyền của bạn",
      blocks: [
        {
          kind: "paragraph",
          text: `Hãy viết thư tới ${LEGAL_CONTACT_EMAIL} và chúng tôi sẽ cho bạn biết chúng tôi đang giữ những gì gắn với địa chỉ của bạn, sửa nó, xóa nó trước thời hạn lưu giữ, hoặc ghi nhận rằng bạn đã rút lại sự đồng ý. Hiện chúng tôi xử lý các yêu cầu này thủ công thay vì qua một màn hình tự phục vụ; số lượng yêu cầu chưa đủ để cần tự động hóa. Chúng tôi đặt mục tiêu phản hồi trong vòng 30 ngày.`,
        },
      ],
    },
    {
      heading: "Bảo mật",
      blocks: [
        {
          kind: "paragraph",
          text: "Dịch vụ chỉ được phục vụ qua HTTPS. Thông tin đăng nhập và khóa của các nhà cung cấp được giữ trong kho bí mật đã mã hóa, không bao giờ nằm trong mã nguồn. Mật khẩu được lưu ở dạng băm. Không dịch vụ nào miễn nhiễm trước sự cố xâm nhập, và nếu điều đó xảy ra ở đây, chúng tôi sẽ thông báo kịp thời cho những người dùng bị ảnh hưởng.",
        },
      ],
    },
    {
      heading: "Thay đổi và liên hệ",
      blocks: [
        {
          kind: "paragraph",
          text: `Ngày ở đầu trang phản ánh phiên bản hiện hành. Nếu một thay đổi ảnh hưởng đáng kể tới cách chúng tôi xử lý dữ liệu của bạn, chúng tôi sẽ thông báo cho chủ tài khoản qua email trước khi thay đổi có hiệu lực. Mọi câu hỏi xin gửi tới ${LEGAL_CONTACT_EMAIL}.`,
        },
      ],
    },
  ],
};
