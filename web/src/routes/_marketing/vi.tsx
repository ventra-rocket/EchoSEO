import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { landingContent } from "@/components/landing-content";
import { buildPageSeo } from "@/lib/seo";

const LOCALE_ALTERNATES = [
  { hreflang: "en", path: "/" },
  { hreflang: "vi", path: "/vi" },
  { hreflang: "x-default", path: "/" },
];

export const Route = createFileRoute("/_marketing/vi")({
  head: () => {
    const c = landingContent.vi;
    return buildPageSeo({
      title: c.meta.title,
      description: c.meta.description,
      path: "/vi",
      imageAlt: "EchoSEO — nền tảng SEO mã nguồn mở cho AI agent",
      ogLocale: c.ogLocale,
      alternates: LOCALE_ALTERNATES,
    });
  },
  component: () => <LandingPage locale="vi" />,
});
