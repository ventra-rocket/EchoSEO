/**
 * `head()` for the two legal routes.
 *
 * These pages are indexable on purpose — a visitor (and a reviewer deciding
 * whether to trust the service) should be able to find them from search. They
 * self-canonical through the same `publicUrl()` helper the landings use, so the
 * canonical, the sitemap entry, and the served URL cannot drift apart.
 *
 * No hreflang here, unlike the landings: there is currently one language of each
 * document, and advertising an alternate that does not exist is worse than
 * advertising none.
 */
import { publicUrl } from "@/shared/free-seo-check";
import type { LegalDocument } from "./legal-content";

export function buildLegalHead(doc: LegalDocument, path: string) {
  const canonical = publicUrl(path);
  const title = `${doc.title} — EchoSEO`;
  return {
    meta: [
      { title },
      { name: "description", content: doc.summary },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:title", content: title },
      { property: "og:description", content: doc.summary },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: doc.summary },
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}
