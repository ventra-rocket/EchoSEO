import { Link } from "@tanstack/react-router";
import { featureGroups } from "@/lib/feature-pages";

const featureLinks = featureGroups.flatMap((group) =>
  group.pages.map((page) => ({
    label: page.eyebrow,
    href: `/features/${page.slug}`,
  })),
);

/** Compact footer for non-home marketing pages (features, etc.). The home
 *  landing renders its own bilingual footer. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Link to="/" className="text-sm font-semibold text-neutral-900">
        Echo<span className="text-[#0b7a5f]">SEO</span>
      </Link>

      <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4">
        <div>
          <p className="font-semibold text-neutral-900">Features</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {featureLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <Link to="/features">All features</Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">AI agents</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link to="/features/mcp">EchoSEO MCP</Link>
            <Link to="/google-search-console-mcp">
              Google Search Console MCP
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">Resources</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link to="/open-source-seo">Why open source?</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/blogs">Blog</Link>
            <a href="/docs">Docs</a>
            <a
              href="https://echoseo.ventrarocket.vn/free-seo-check"
              target="_blank"
              rel="noopener noreferrer"
            >
              Free SEO check
            </a>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">Project</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <a
              href="https://github.com/ventra-rocket/EchoSEO"
              target="_blank"
              rel="noopener noreferrer"
            >
              EchoSEO on GitHub
            </a>
            {/* Upstream credit, kept: MIT requires the notice and the fork is
                real. It sits BELOW EchoSEO's own repo so the first GitHub link
                a reader takes is this project's. */}
            <a
              href="https://github.com/every-app/open-seo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Built on open-seo
            </a>
            {/* The app serves the one copy of the legal text — see URLS in
                landing-content.ts for why there is only one. */}
            <a
              href="https://app.echoseo.ventrarocket.vn/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
            <a
              href="https://app.echoseo.ventrarocket.vn/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
