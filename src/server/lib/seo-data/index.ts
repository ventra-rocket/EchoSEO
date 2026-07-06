import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";

/**
 * The capability surface an SEO data provider exposes to feature services and
 * MCP tools, grouped by data domain (business, backlinks, keywords, domain,
 * serp, labs, lighthouse, aiSearch). Each method takes a typed input and
 * resolves to unwrapped provider data; billing/metering is handled inside the
 * provider, transparent to callers.
 *
 * Today the shapes are DataForSEO's canonical response types — effectively the
 * app's SEO data model. A future provider (a raw-SERP vendor, or a per-tenant
 * BYO-key managed tier) must map its responses into these same types to remain
 * a drop-in. This is the single abstraction call sites depend on; they must not
 * import the concrete DataForSEO client. See README.md for the add-a-provider
 * contract.
 */
export type SeoDataProvider = ReturnType<typeof createDataforseoClient>;

/**
 * Resolve the active SEO data provider for a billing customer. DataForSEO is
 * the only implementation today, so this delegates straight to it — but it is
 * the single seam where an env-selected or per-tenant provider would branch
 * later, without touching any call site.
 */
export function createSeoDataProvider(
  customer: BillingCustomerContext,
): SeoDataProvider {
  return createDataforseoClient(customer);
}
