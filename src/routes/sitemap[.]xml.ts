import { createFileRoute } from "@tanstack/react-router";
import {
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  publicUrl,
} from "@/shared/free-seo-check";

// Curated landings only — never the `/r/` report pages, which are unlisted
// bearer links (robots.txt disallows them and each carries X-Robots-Tag:
// noindex). Absolute URLs share one origin with the pages' canonical tags via
// publicUrl(), so a crawler never sees the sitemap and the canonical disagree.
// Paths must stay query-free — <loc> is interpolated without XML escaping, which
// is safe only while no path carries `&`, `<`, or `>`.
const LANDING_PATHS = [
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
];

function sitemapXml(): string {
  const urls = LANDING_PATHS.map(
    (path) => `  <url><loc>${publicUrl(path)}</loc></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemapXml(), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        }),
    },
  },
});
