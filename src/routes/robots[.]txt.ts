import { createFileRoute } from "@tanstack/react-router";
import {
  FREE_SEO_CHECK_REPORT_ROUTE_PREFIX,
  LITE_REPORT_FIXTURE_ROUTE,
  publicUrl,
} from "@/shared/free-seo-check";

// Shared Deep report links are bearer capabilities: anyone holding one can read
// the report, so they must never end up in a search index. The `/r/{id}`
// response also carries `X-Robots-Tag: noindex` (server.ts) — this file is the
// crawler-facing half of the same rule, and the only one a crawler sees before
// requesting the page. `/accept-invitation/{id}` is likewise a capability link
// (its id gates joining a workspace) and has no reason to be crawled or indexed.
// The fixture route 404s in any shipped build, but it is listed anyway: a rule
// costs nothing, and it holds if a build ever ships with the flag on by mistake.
const ROBOTS_TXT = `User-agent: *
Disallow: ${FREE_SEO_CHECK_REPORT_ROUTE_PREFIX}
Disallow: /accept-invitation
Disallow: ${LITE_REPORT_FIXTURE_ROUTE}
Sitemap: ${publicUrl("/sitemap.xml")}
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(ROBOTS_TXT, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
