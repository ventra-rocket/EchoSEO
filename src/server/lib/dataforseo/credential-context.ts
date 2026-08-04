/**
 * Ambient DataForSEO key resolver for the current async request.
 *
 * The DataForSEO SDK fetchers (`backlinksApi()`, `serpApi()`, ...) are created
 * without a key parameter, so threading a per-organization key through every
 * signature would touch a dozen files. Instead the metering chokepoint
 * (`meterDataforseoCall`) wraps each call in `runWithDataforseoKey`, and the
 * authenticated fetch reads the resolver back with `getDataforseoKeyResolver`.
 * When no resolver is set (e.g. self-host, or a code path outside the metering
 * wrapper) the fetch falls back to the global `DATAFORSEO_API_KEY`, preserving
 * existing behavior. `nodejs_compat` is enabled, so `AsyncLocalStorage` is
 * available in the Workers runtime.
 */
import { AsyncLocalStorage } from "node:async_hooks";

/** Lazily resolves the raw DataForSEO key (base64 `login:password`) to use. */
type DataforseoKeyResolver = () => Promise<string>;

const dataforseoKeyStore = new AsyncLocalStorage<DataforseoKeyResolver>();

/**
 * Run `fn` with `resolver` set as the ambient DataForSEO key resolver for the
 * duration of the (possibly async) callback. The resolver is memoized by the
 * caller so it is invoked at most once per metered call.
 */
export function runWithDataforseoKey<T>(
  resolver: DataforseoKeyResolver,
  fn: () => T,
): T {
  return dataforseoKeyStore.run(resolver, fn);
}

/**
 * The ambient resolver for the current async context, or `undefined` when the
 * call is not running inside `runWithDataforseoKey`.
 */
export function getDataforseoKeyResolver(): DataforseoKeyResolver | undefined {
  return dataforseoKeyStore.getStore();
}
