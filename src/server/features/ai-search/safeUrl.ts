/**
 * AI Search renders citation and top-page URLs as `<a href>` in the UI. The
 * URLs come from either DataForSEO (mostly safe but still external) or LLM
 * responses (untrusted — a crafted prompt can coax a model into emitting
 * `javascript:`/`data:` payloads).
 *
 * The check itself is shared with every other untrusted-URL surface (the site
 * audit renders crawled URLs the same way), so it lives in `@/lib/safe-url`.
 * This module stays as the AI Search entry point and its tests guard the
 * shared behaviour.
 */
export { safeHttpUrl, safeHostname } from "@/lib/safe-url";
