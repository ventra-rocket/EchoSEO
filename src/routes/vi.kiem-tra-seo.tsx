import { createFileRoute } from "@tanstack/react-router";
import { FreeSeoCheckLanding } from "@/client/features/free-seo-check/FreeSeoCheckLanding";
import { buildLandingHead } from "@/client/features/free-seo-check/landing-head";

// Vietnamese landing at /vi/kiem-tra-seo — a distinct URL from the English
// /free-seo-check so hreflang can treat them as translations of one page. Renders
// the same component in Vietnamese; the locale is fixed by the route, not a cookie.
export const Route = createFileRoute("/vi/kiem-tra-seo")({
  head: () => buildLandingHead("vi"),
  component: () => <FreeSeoCheckLanding locale="vi" />,
});
