/**
 * Landing-page copy + data, split from the visual component so the homepage can
 * render English (`/`) and Vietnamese (`/vi`) from one source of truth.
 *
 * Every claim here is grounded in verified product facts (see the plan's
 * product-truth report): open-source/self-hostable, Cloudflare-native,
 * first-party Google Search Console, bring-your-own DataForSEO key, MCP for AI
 * agents, assisted read-only workflows, re-crawl fix verification, EN+VI.
 * No testimonials, customer logos, usage counters, star counts, pricing tiers,
 * or autonomous-publishing claims.
 */

import { featurePages } from "@/lib/feature-pages";

export type LandingLocale = "en" | "vi";

/** The app (auth, free checker, dashboard, MCP) lives on the app subdomain; the
 *  apex is this marketing landing. Product CTAs cross over to the app origin. */
const APP = "https://app.echoseo.ventrarocket.vn";

/** Centralized destinations — verified live EchoSEO surfaces. */
export const URLS = {
  signUp: `${APP}/sign-up`,
  signIn: `${APP}/sign-in`,
  freeCheck: {
    en: `${APP}/free-seo-check`,
    vi: `${APP}/vi/kiem-tra-seo`,
  },
  features: "/features",
  mcp: "/features/mcp",
  searchConsoleMcp: "/google-search-console-mcp",
  // The app owns the legal text. There is exactly one copy of it, because two
  // copies of a binding document drift and only one of them can be the one the
  // OAuth consent screen links to.
  privacy: `${APP}/privacy`,
  terms: `${APP}/terms-and-conditions`,
  /** EchoSEO's own repository — public, and where "show me the code" belongs. */
  repo: "https://github.com/ventra-rocket/EchoSEO",
  /** The upstream MIT project EchoSEO is built on. Kept as attribution, which
   * MIT requires and which is honest; never presented as EchoSEO's own repo. */
  upstreamRepo: "https://github.com/every-app/open-seo",
} as const;

type TitlePart = { text: string; accent?: boolean; nowrap?: boolean };
type Cta = { label: string; href: string; external?: boolean };
type WorkflowItem = { name: string; blurb: string; slug: string };
type WorkflowGroup = { label: string; desc: string; items: WorkflowItem[] };
type Point = { title: string; blurb: string };
type FooterColumn = { title: string; links: Cta[] };

/** Authored hero product surface — mirrors real EchoSEO app views (keyword
 *  research + GSC performance) with example data, always marked "sample". Chrome
 *  labels localize; the SEO keywords and numeric shape are shared across locales. */
type SurfaceMetric = { label: string; value: string; delta: string };
type SurfaceRow = { keyword: string; volume: string; kd: string; pos: string };
export type HeroSurface = {
  view: string;
  sampleTag: string;
  aria: string;
  tabs: string[];
  metrics: SurfaceMetric[];
  chartTitle: string;
  chartRange: string;
  axisLabels: string[];
  cols: { keyword: string; volume: string; kd: string; pos: string };
  rows: SurfaceRow[];
};

export type LandingContent = {
  htmlLang: string;
  ogLocale: string;
  meta: { title: string; description: string };
  nav: {
    product: string;
    openSource: string;
    freeCheck: string;
    signIn: string;
    startFree: string;
    menuOpen: string;
    menuClose: string;
    langSwitchLabel: string;
    productGroups: { label: string; items: { name: string; slug: string }[] }[];
    agentsHeading: string;
    mcpName: string;
    mcpBlurb: string;
    scMcpName: string;
    scMcpBlurb: string;
    allFeatures: string;
  };
  hero: {
    eyebrow: string;
    titleParts: TitlePart[];
    subtitle: string;
    microTrust: string;
    ctaPrimary: Cta;
    ctaSecondary: Cta;
    floatingChips: string[];
    surface: HeroSurface;
  };
  chips: string[];
  workflows: {
    eyebrow: string;
    title: string;
    subtitle: string;
    allLabel: string;
    groups: WorkflowGroup[];
  };
  agent: {
    eyebrow: string;
    title: string;
    subtitle: string;
    clientsLabel: string;
    clientList: string;
    cta: Cta;
    terminalCaption: string;
    terminalAria: string;
    exampleTag: string;
  };
  evidence: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: Point[];
    verdicts: { ok: string; warn: string; err: string };
    boundary: string;
  };
  openSource: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: string[];
    cta: Cta;
  };
  bilingual: { title: string; subtitle: string; cta: Cta };
  finalCta: {
    title: string;
    subtitle: string;
    ctaPrimary: Cta;
    ctaSecondary: Cta;
  };
  footer: {
    tagline: string;
    columns: FooterColumn[];
    langAlt: Cta;
    legal: string;
  };
};

const S = featurePages;

export const landingContent: Record<LandingLocale, LandingContent> = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    meta: {
      title: "EchoSEO - Open-source, agent-native SEO platform",
      description:
        "Open-source SEO workspace built on evidence you can trace — first-party Google Search Console, your own DataForSEO key, and MCP tools for your AI agents.",
    },
    nav: {
      product: "Product",
      openSource: "Open source",
      freeCheck: "Free SEO check",
      signIn: "Sign in",
      startFree: "Start free",
      menuOpen: "Open menu",
      menuClose: "Close menu",
      langSwitchLabel: "Language",
      productGroups: [
        {
          label: "Keyword workflows",
          items: [
            { name: S.keywordResearch.eyebrow, slug: S.keywordResearch.slug },
            { name: S.savedKeywords.eyebrow, slug: S.savedKeywords.slug },
            { name: S.rankTracking.eyebrow, slug: S.rankTracking.slug },
          ],
        },
        {
          label: "Domain research",
          items: [
            { name: S.domainOverview.eyebrow, slug: S.domainOverview.slug },
            { name: S.backlinkChecker.eyebrow, slug: S.backlinkChecker.slug },
            { name: S.siteAudit.eyebrow, slug: S.siteAudit.slug },
          ],
        },
        {
          label: "AI visibility",
          items: [
            {
              name: S.aiBrandVisibility.eyebrow,
              slug: S.aiBrandVisibility.slug,
            },
            { name: S.aiSearchPrompts.eyebrow, slug: S.aiSearchPrompts.slug },
          ],
        },
      ],
      agentsHeading: "AI agents",
      mcpName: "EchoSEO MCP",
      mcpBlurb: "Connect Claude, Codex, and agents.",
      scMcpName: "Search Console MCP",
      scMcpBlurb: "Search Console data for agents.",
      allFeatures: "View all features",
    },
    hero: {
      eyebrow: "Open-source · agent-native SEO",
      titleParts: [
        { text: "The " },
        { text: "open-source", nowrap: true },
        { text: " SEO workspace " },
        { text: "your AI agent", accent: true, nowrap: true },
        { text: " can actually use." },
      ],
      subtitle:
        "EchoSEO fuses first-party Google Search Console data with your own DataForSEO key — and hands every workflow to your agents over MCP. Self-host it on Cloudflare, or start free on hosted.",
      microTrust: "open source · self-hostable · no credit card",
      ctaPrimary: { label: "Start free", href: URLS.signUp },
      ctaSecondary: {
        label: "Run the free SEO check",
        href: URLS.freeCheck.en,
      },
      floatingChips: ["First-party GSC", "MCP-ready", "BYO DataForSEO"],
      surface: {
        view: "Keyword research",
        sampleTag: "sample data",
        aria: "Illustrative EchoSEO workspace populated with sample data: a keyword table, an organic-clicks trend chart, and summary metric cards.",
        tabs: ["Overview", "Keywords", "Backlinks", "Site audit"],
        metrics: [
          { label: "Organic clicks", value: "1,204", delta: "+12%" },
          { label: "Impressions", value: "38,902", delta: "+8%" },
          { label: "Avg. position", value: "12.4", delta: "1.6" },
        ],
        chartTitle: "Organic clicks",
        chartRange: "last 12 weeks",
        axisLabels: ["May", "Jun", "Jul", "Aug"],
        cols: { keyword: "Keyword", volume: "Volume", kd: "KD", pos: "Pos" },
        rows: [
          { keyword: "seo audit tool", volume: "2,400", kd: "34", pos: "8" },
          {
            keyword: "free seo audit tool",
            volume: "1,300",
            kd: "22",
            pos: "12",
          },
          { keyword: "website audit tool", volume: "880", kd: "28", pos: "15" },
          { keyword: "core web vitals", volume: "3,200", kd: "47", pos: "6" },
          {
            keyword: "technical seo checklist",
            volume: "1,600",
            kd: "41",
            pos: "21",
          },
        ],
      },
    },
    chips: [
      "First-party Google Search Console",
      "Bring your own DataForSEO key",
      "MCP for Claude, Codex & agents",
      "Self-host on Cloudflare",
    ],
    workflows: {
      eyebrow: "One workspace",
      title: "The SEO work that matters, in one place.",
      subtitle:
        "Keyword research, competitor analysis, backlinks, rank tracking, technical audits, and AI-search visibility — connected to each other, on data you control.",
      allLabel: "View all features",
      groups: [
        {
          label: "Keyword workflows",
          desc: "Find, organize, and monitor the keywords that matter.",
          items: [
            {
              name: S.keywordResearch.eyebrow,
              blurb: "Find ideas, demand, difficulty, intent, and live SERPs.",
              slug: S.keywordResearch.slug,
            },
            {
              name: S.savedKeywords.eyebrow,
              blurb: "Organize opportunities for content and tracking.",
              slug: S.savedKeywords.slug,
            },
            {
              name: S.rankTracking.eyebrow,
              blurb: "Track keyword positions over time.",
              slug: S.rankTracking.slug,
            },
          ],
        },
        {
          label: "Domain research",
          desc: "Understand competitors, backlinks, and technical health.",
          items: [
            {
              name: S.domainOverview.eyebrow,
              blurb: "Estimate organic traffic and ranking keywords.",
              slug: S.domainOverview.slug,
            },
            {
              name: S.backlinkChecker.eyebrow,
              blurb:
                "Inspect backlinks and referring domains (your DataForSEO key).",
              slug: S.backlinkChecker.slug,
            },
            {
              name: S.siteAudit.eyebrow,
              blurb: "Crawl pages and surface technical issues.",
              slug: S.siteAudit.slug,
            },
          ],
        },
        {
          label: "AI visibility",
          desc: "Research AI prompts, citations, and brand visibility.",
          items: [
            {
              name: S.aiBrandVisibility.eyebrow,
              blurb: "Review brand mentions and citations in AI search.",
              slug: S.aiBrandVisibility.slug,
            },
            {
              name: S.aiSearchPrompts.eyebrow,
              blurb: "Compare prompts across supported AI models.",
              slug: S.aiSearchPrompts.slug,
            },
          ],
        },
      ],
    },
    agent: {
      eyebrow: "Model Context Protocol",
      title: "Give your agent real SEO data, not guesses.",
      subtitle:
        "Your AI agent researches keywords, competitors, backlinks, and Google Search Console performance through EchoSEO's typed MCP tools — then you review the work in the app.",
      clientsLabel: "Works with",
      clientList: "claude · codex · cursor · any MCP client",
      cta: { label: "Learn about MCP", href: URLS.mcp },
      terminalCaption: "claude · echoseo mcp",
      terminalAria: "Example: connecting an agent to the EchoSEO MCP server",
      exampleTag: "example",
    },
    evidence: {
      eyebrow: "Evidence-first",
      title: "Every finding traces back to its source.",
      subtitle:
        "EchoSEO is built to be checked, not trusted blindly. See where each number comes from and prove a fix actually landed.",
      points: [
        {
          title: "Re-crawl to verify a fix",
          blurb:
            "Re-crawl a page after you change it and see each issue marked resolved, still present, or regressed — not just a fresh score.",
        },
        {
          title: "Cited Google guidance",
          blurb:
            "Site-audit issues link to the relevant Google guidance, so you know why a fix matters before you make it.",
        },
        {
          title: "Transparent provenance",
          blurb:
            "Metrics carry their provenance — first-party Search Console, your DataForSEO key, or your own crawl — so you know exactly what you're looking at.",
        },
        {
          title: "Read-only by default",
          blurb:
            "Assisted workflows stay read-only until there's an explicit, guarded publishing step. Your site changes when you decide.",
        },
      ],
      verdicts: { ok: "resolved", warn: "still present", err: "regressed" },
      boundary: "assisted · read-only — your agent proposes, you decide",
    },
    openSource: {
      eyebrow: "Open core",
      title: "Own your SEO stack.",
      subtitle:
        "EchoSEO is open-core — built on the MIT-licensed open-seo project — and self-hostable on Cloudflare. Run it yourself, bring your own API keys, keep your data — no lock-in.",
      points: [
        "MIT open-core, built on the open-seo project",
        "Runs on Cloudflare Workers, D1, R2 & Workflows",
        "Bring your own DataForSEO and Google keys",
        "Fork, audit, and extend the MIT open-seo core",
      ],
      // "Own your SEO stack" has to be able to end on EchoSEO's own source.
      // The upstream credit is in the copy above and in the footer; sending the
      // one "show me the code" click to someone else's repository is what makes
      // an open-core claim ring hollow.
      cta: {
        label: "View EchoSEO on GitHub",
        href: URLS.repo,
        external: true,
      },
    },
    bilingual: {
      title: "Built for English and Vietnamese teams.",
      subtitle:
        "The public SEO tools and reports are fully localized in English and Vietnamese.",
      cta: { label: "Xem bản tiếng Việt", href: "/vi" },
    },
    finalCta: {
      title: "Start with SEO data you can trust.",
      subtitle:
        "Open-access while EchoSEO is in preview — no credit card required.",
      ctaPrimary: { label: "Start free", href: URLS.signUp },
      ctaSecondary: {
        label: "Run the free SEO check",
        href: URLS.freeCheck.en,
      },
    },
    footer: {
      tagline: "Open-source, agent-native SEO. Self-host it or run it hosted.",
      columns: [
        {
          title: "Product",
          links: [
            { label: "Features", href: URLS.features },
            {
              label: S.keywordResearch.eyebrow,
              href: `/features/${S.keywordResearch.slug}`,
            },
            {
              label: S.siteAudit.eyebrow,
              href: `/features/${S.siteAudit.slug}`,
            },
            {
              label: S.backlinkChecker.eyebrow,
              href: `/features/${S.backlinkChecker.slug}`,
            },
          ],
        },
        {
          title: "Workflows",
          links: [
            {
              label: S.domainOverview.eyebrow,
              href: `/features/${S.domainOverview.slug}`,
            },
            {
              label: S.rankTracking.eyebrow,
              href: `/features/${S.rankTracking.slug}`,
            },
            {
              label: S.aiBrandVisibility.eyebrow,
              href: `/features/${S.aiBrandVisibility.slug}`,
            },
            {
              label: S.aiSearchPrompts.eyebrow,
              href: `/features/${S.aiSearchPrompts.slug}`,
            },
          ],
        },
        {
          title: "AI agents",
          links: [
            { label: "EchoSEO MCP", href: URLS.mcp },
            { label: "Search Console MCP", href: URLS.searchConsoleMcp },
            {
              label: "Free SEO check",
              href: URLS.freeCheck.en,
              external: true,
            },
          ],
        },
        {
          title: "Project",
          links: [
            { label: "EchoSEO on GitHub", href: URLS.repo, external: true },
            {
              label: "Built on open-seo",
              href: URLS.upstreamRepo,
              external: true,
            },
            { label: "Privacy", href: URLS.privacy, external: true },
            { label: "Terms", href: URLS.terms, external: true },
          ],
        },
      ],
      langAlt: { label: "Tiếng Việt", href: "/vi" },
      legal: "© 2026 EchoSEO · Built by VentraRocket",
    },
  },

  vi: {
    htmlLang: "vi",
    ogLocale: "vi_VN",
    meta: {
      title: "EchoSEO - Nền tảng SEO mã nguồn mở, hợp tác cùng AI agent",
      description:
        "Workspace SEO mã nguồn mở dựa trên bằng chứng truy vết được — Google Search Console chính chủ, DataForSEO key của bạn, và công cụ MCP cho AI agent.",
    },
    nav: {
      product: "Sản phẩm",
      openSource: "Mã nguồn mở",
      freeCheck: "Kiểm tra SEO miễn phí",
      signIn: "Đăng nhập",
      startFree: "Bắt đầu miễn phí",
      menuOpen: "Mở menu",
      menuClose: "Đóng menu",
      langSwitchLabel: "Ngôn ngữ",
      productGroups: [
        {
          label: "Nghiên cứu từ khóa",
          items: [
            { name: "Nghiên cứu từ khóa", slug: S.keywordResearch.slug },
            { name: "Từ khóa đã lưu", slug: S.savedKeywords.slug },
            { name: "Theo dõi thứ hạng", slug: S.rankTracking.slug },
          ],
        },
        {
          label: "Nghiên cứu domain",
          items: [
            { name: "Tổng quan domain", slug: S.domainOverview.slug },
            { name: "Kiểm tra backlink", slug: S.backlinkChecker.slug },
            { name: "Audit kỹ thuật", slug: S.siteAudit.slug },
          ],
        },
        {
          label: "Hiện diện trên AI",
          items: [
            {
              name: "Hiện diện thương hiệu AI",
              slug: S.aiBrandVisibility.slug,
            },
            { name: "Khám phá prompt", slug: S.aiSearchPrompts.slug },
          ],
        },
      ],
      agentsHeading: "AI agent",
      mcpName: "EchoSEO MCP",
      mcpBlurb: "Kết nối Claude, Codex và các agent.",
      scMcpName: "Search Console MCP",
      scMcpBlurb: "Dữ liệu Search Console cho agent.",
      allFeatures: "Xem tất cả tính năng",
    },
    hero: {
      eyebrow: "SEO mã nguồn mở · hợp tác cùng agent",
      titleParts: [
        { text: "Workspace SEO " },
        { text: "mã nguồn mở", nowrap: true },
        { text: " mà " },
        { text: "AI agent của bạn", accent: true, nowrap: true },
        { text: " thật sự dùng được." },
      ],
      subtitle:
        "EchoSEO hợp nhất dữ liệu Google Search Console chính chủ với DataForSEO key của riêng bạn — và giao mọi quy trình cho agent qua MCP. Tự host trên Cloudflare, hoặc bắt đầu miễn phí trên bản hosted.",
      microTrust: "mã nguồn mở · tự host được · không cần thẻ",
      ctaPrimary: { label: "Bắt đầu miễn phí", href: URLS.signUp },
      ctaSecondary: {
        label: "Kiểm tra SEO miễn phí",
        href: URLS.freeCheck.vi,
      },
      floatingChips: ["GSC chính chủ", "Sẵn sàng MCP", "DataForSEO của bạn"],
      surface: {
        view: "Nghiên cứu từ khóa",
        sampleTag: "dữ liệu mẫu",
        aria: "Workspace EchoSEO minh họa với dữ liệu mẫu: bảng từ khóa, biểu đồ xu hướng clicks organic và các thẻ chỉ số tổng hợp.",
        tabs: ["Tổng quan", "Từ khóa", "Backlink", "Audit"],
        metrics: [
          { label: "Clicks organic", value: "1,204", delta: "+12%" },
          { label: "Lượt hiển thị", value: "38,902", delta: "+8%" },
          { label: "Vị trí TB", value: "12.4", delta: "1.6" },
        ],
        chartTitle: "Clicks organic",
        chartRange: "12 tuần gần nhất",
        axisLabels: ["Th5", "Th6", "Th7", "Th8"],
        cols: { keyword: "Từ khóa", volume: "Volume", kd: "KD", pos: "Hạng" },
        rows: [
          { keyword: "seo audit tool", volume: "2,400", kd: "34", pos: "8" },
          {
            keyword: "free seo audit tool",
            volume: "1,300",
            kd: "22",
            pos: "12",
          },
          { keyword: "website audit tool", volume: "880", kd: "28", pos: "15" },
          { keyword: "core web vitals", volume: "3,200", kd: "47", pos: "6" },
          {
            keyword: "technical seo checklist",
            volume: "1,600",
            kd: "41",
            pos: "21",
          },
        ],
      },
    },
    chips: [
      "Google Search Console chính chủ",
      "Dùng DataForSEO key của riêng bạn",
      "MCP cho Claude, Codex & agent",
      "Tự host trên Cloudflare",
    ],
    workflows: {
      eyebrow: "Một workspace",
      title: "Những việc SEO quan trọng, gom về một chỗ.",
      subtitle:
        "Nghiên cứu từ khóa, phân tích đối thủ, backlink, theo dõi thứ hạng, audit kỹ thuật và hiện diện trên AI search — liên kết với nhau, trên dữ liệu do bạn kiểm soát.",
      allLabel: "Xem tất cả tính năng",
      groups: [
        {
          label: "Nghiên cứu từ khóa",
          desc: "Tìm, sắp xếp và theo dõi những từ khóa quan trọng.",
          items: [
            {
              name: "Nghiên cứu từ khóa",
              blurb: "Tìm ý tưởng, nhu cầu, độ khó, intent và SERP trực tiếp.",
              slug: S.keywordResearch.slug,
            },
            {
              name: "Từ khóa đã lưu",
              blurb: "Sắp xếp cơ hội cho nội dung và theo dõi.",
              slug: S.savedKeywords.slug,
            },
            {
              name: "Theo dõi thứ hạng",
              blurb: "Theo dõi vị trí từ khóa theo thời gian.",
              slug: S.rankTracking.slug,
            },
          ],
        },
        {
          label: "Nghiên cứu domain",
          desc: "Hiểu đối thủ, backlink và sức khỏe kỹ thuật.",
          items: [
            {
              name: "Tổng quan domain",
              blurb: "Ước lượng traffic organic và từ khóa đang xếp hạng.",
              slug: S.domainOverview.slug,
            },
            {
              name: "Kiểm tra backlink",
              blurb:
                "Xem backlink và referring domain (bằng DataForSEO key của bạn).",
              slug: S.backlinkChecker.slug,
            },
            {
              name: "Audit kỹ thuật",
              blurb: "Crawl trang và phát hiện lỗi kỹ thuật.",
              slug: S.siteAudit.slug,
            },
          ],
        },
        {
          label: "Hiện diện trên AI",
          desc: "Nghiên cứu prompt AI, trích dẫn và hiện diện thương hiệu.",
          items: [
            {
              name: "Hiện diện thương hiệu AI",
              blurb: "Xem thương hiệu được nhắc và trích dẫn trong AI search.",
              slug: S.aiBrandVisibility.slug,
            },
            {
              name: "Khám phá prompt",
              blurb: "So sánh prompt trên các mô hình AI được hỗ trợ.",
              slug: S.aiSearchPrompts.slug,
            },
          ],
        },
      ],
    },
    agent: {
      eyebrow: "Model Context Protocol",
      title: "Cho agent dữ liệu SEO thật, không phải phỏng đoán.",
      subtitle:
        "AI agent của bạn nghiên cứu từ khóa, đối thủ, backlink và hiệu suất Google Search Console qua các công cụ MCP có kiểu dữ liệu rõ ràng của EchoSEO — rồi bạn xem lại kết quả ngay trong app.",
      clientsLabel: "Hoạt động với",
      clientList: "claude · codex · cursor · mọi MCP client",
      cta: { label: "Tìm hiểu về MCP", href: URLS.mcp },
      terminalCaption: "claude · echoseo mcp",
      terminalAria: "Ví dụ: kết nối agent với EchoSEO MCP server",
      exampleTag: "ví dụ",
    },
    evidence: {
      eyebrow: "Ưu tiên bằng chứng",
      title: "Mọi kết luận đều truy về nguồn.",
      subtitle:
        "EchoSEO được xây để bạn kiểm chứng, không phải tin mù. Thấy rõ mỗi con số đến từ đâu và chứng minh một sửa lỗi thực sự có hiệu lực.",
      points: [
        {
          title: "Crawl lại để xác nhận đã sửa",
          blurb:
            "Crawl lại một trang sau khi bạn chỉnh và thấy từng lỗi được đánh dấu đã xử lý, còn tồn tại, hay tái diễn — không chỉ là một điểm số mới.",
        },
        {
          title: "Trích dẫn hướng dẫn của Google",
          blurb:
            "Lỗi trong audit dẫn tới đúng hướng dẫn liên quan của Google, để bạn hiểu vì sao cần sửa trước khi sửa.",
        },
        {
          title: "Nguồn gốc minh bạch",
          blurb:
            "Chỉ số cho biết nguồn gốc của nó — Search Console chính chủ, DataForSEO key của bạn, hay bản crawl của chính bạn — để bạn biết chính xác mình đang xem gì.",
        },
        {
          title: "Chỉ đọc theo mặc định",
          blurb:
            "Các luồng hỗ trợ giữ ở chế độ chỉ đọc cho tới khi có bước xuất bản rõ ràng, được kiểm soát. Website chỉ thay đổi khi bạn quyết định.",
        },
      ],
      verdicts: { ok: "đã xử lý", warn: "còn tồn tại", err: "tái diễn" },
      boundary: "hỗ trợ · chỉ đọc — agent đề xuất, bạn quyết định",
    },
    openSource: {
      eyebrow: "Open core",
      title: "Làm chủ stack SEO của bạn.",
      subtitle:
        "EchoSEO theo mô hình open-core — xây trên dự án open-seo giấy phép MIT — và tự host được trên Cloudflare. Tự chạy, dùng API key của riêng bạn, giữ dữ liệu của bạn — không khóa chân.",
      points: [
        "Open-core giấy phép MIT, xây trên dự án open-seo",
        "Chạy trên Cloudflare Workers, D1, R2 & Workflows",
        "Dùng DataForSEO và Google key của riêng bạn",
        "Fork, kiểm tra, mở rộng lõi open-seo (MIT)",
      ],
      cta: {
        label: "Xem EchoSEO trên GitHub",
        href: URLS.repo,
        external: true,
      },
    },
    bilingual: {
      title: "Làm cho cả đội ngũ tiếng Việt và tiếng Anh.",
      subtitle:
        "Bộ công cụ và báo cáo SEO công khai được bản địa hóa đầy đủ tiếng Việt và tiếng Anh.",
      cta: { label: "View in English", href: "/" },
    },
    finalCta: {
      title: "Bắt đầu với dữ liệu SEO đáng tin.",
      subtitle:
        "Mở truy cập trong giai đoạn preview của EchoSEO — không cần thẻ tín dụng.",
      ctaPrimary: { label: "Bắt đầu miễn phí", href: URLS.signUp },
      ctaSecondary: {
        label: "Kiểm tra SEO miễn phí",
        href: URLS.freeCheck.vi,
      },
    },
    footer: {
      tagline:
        "SEO mã nguồn mở, hợp tác cùng agent. Tự host hoặc dùng bản hosted.",
      columns: [
        {
          title: "Sản phẩm",
          links: [
            { label: "Tính năng", href: URLS.features },
            {
              label: "Nghiên cứu từ khóa",
              href: `/features/${S.keywordResearch.slug}`,
            },
            { label: "Audit kỹ thuật", href: `/features/${S.siteAudit.slug}` },
            {
              label: "Kiểm tra backlink",
              href: `/features/${S.backlinkChecker.slug}`,
            },
          ],
        },
        {
          title: "Quy trình",
          links: [
            {
              label: "Tổng quan domain",
              href: `/features/${S.domainOverview.slug}`,
            },
            {
              label: "Theo dõi thứ hạng",
              href: `/features/${S.rankTracking.slug}`,
            },
            {
              label: "Hiện diện thương hiệu AI",
              href: `/features/${S.aiBrandVisibility.slug}`,
            },
            {
              label: "Khám phá prompt",
              href: `/features/${S.aiSearchPrompts.slug}`,
            },
          ],
        },
        {
          title: "AI agent",
          links: [
            { label: "EchoSEO MCP", href: URLS.mcp },
            { label: "Search Console MCP", href: URLS.searchConsoleMcp },
            {
              label: "Kiểm tra SEO miễn phí",
              href: URLS.freeCheck.vi,
              external: true,
            },
          ],
        },
        {
          title: "Dự án",
          links: [
            { label: "EchoSEO trên GitHub", href: URLS.repo, external: true },
            {
              label: "Xây trên open-seo",
              href: URLS.upstreamRepo,
              external: true,
            },
            { label: "Quyền riêng tư", href: URLS.privacy, external: true },
            { label: "Điều khoản", href: URLS.terms, external: true },
          ],
        },
      ],
      langAlt: { label: "English", href: "/" },
      legal: "© 2026 EchoSEO · Xây bởi VentraRocket",
    },
  },
};
