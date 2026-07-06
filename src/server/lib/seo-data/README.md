# SEO Data Provider Seam

`seo-data` is the provider-abstraction boundary between the app and whatever
service supplies SEO data (keywords, SERP, backlinks, business listings,
Lighthouse, AI-search). Feature services and MCP tools depend on **this module
only** — never on `@/server/lib/dataforseo` directly for constructing a client.

## What call sites use

```ts
import {
  createSeoDataProvider,
  type SeoDataProvider,
} from "@/server/lib/seo-data";

const provider = createSeoDataProvider(billingCustomer);
const rows = await provider.backlinks.summary({ target });
```

- `SeoDataProvider` — the capability surface, grouped by data domain.
- `createSeoDataProvider(customer)` — resolves the active provider for a billing
  customer. This is the only place a future provider selection would branch.

Note: DataForSEO-specific **types** and **helpers** (e.g. `LabsKeywordDataItem`,
`normalizeBacklinksTarget`, `buildLlmTarget`) are the app's canonical SEO data
model and are still imported from `@/server/lib/dataforseo`. Only the _client
construction_ moved behind this seam.

## Why the seam exists

OpenSEO is single-provider and DataForSEO-shaped. Routing every call through one
interface de-risks single-vendor lock-in and gives a clean swap point for a
future raw-SERP vendor or a per-tenant BYO-key managed tier. Phase 0 delivers the
seam only — DataForSEO stays the sole implementation and behaviour is unchanged.

## Adding a second provider (later)

1. Implement a factory that returns an object structurally matching
   `SeoDataProvider` — same domains, same method inputs, mapping the vendor's
   responses into the existing DataForSEO-shaped result types (or, if the shapes
   diverge, first normalise `SeoDataProvider` into neutral types here and add a
   conformance test that both providers satisfy).
2. Handle that provider's own cost/metering **inside** the factory, the way
   `createDataforseoClient` meters DataForSEO — callers stay metering-agnostic.
3. Branch in `createSeoDataProvider` on the selection input (env var and/or a
   per-tenant setting on the customer context).
4. Keep the existing DataForSEO tests green; add tests for the new provider's
   mapping + metering.
