import { getAuthMode, type AuthMode } from "@/lib/auth-mode";

let workersEnvPromise: Promise<Record<string, unknown> | null> | null = null;

/**
 * Read an env var from `process.env` first, then the Workers `env` binding.
 *
 * An empty string counts as UNSET in both branches. A blank var is what you get
 * from a `wrangler secret` set to "" or a var left empty in a dashboard, and
 * every caller treats a returned string as "operator configured this" — so
 * handing back "" silently disables the fallback (see resend-client's `reply_to`
 * contract, which only omits the header when this is `undefined`). The
 * `process.env` branch already behaved this way; the Workers branch did not.
 */
export async function getOptionalEnvValue(
  name: string,
): Promise<string | undefined> {
  const processValue =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (processValue) {
    return processValue;
  }

  const workersEnv = await getWorkersEnv();
  const workerValue = workersEnv?.[name];
  return typeof workerValue === "string" && workerValue !== ""
    ? workerValue
    : undefined;
}

export async function getRequiredEnvValue(name: string): Promise<string> {
  const value = await getOptionalEnvValue(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * The deployment's auth mode, read from the runtime environment.
 *
 * The server-function surface reads `env.AUTH_MODE` directly because it always
 * runs with a request-scoped Cloudflare env. The MCP tool layer does not, so it
 * resolves the mode through this accessor — which is what keeps the audit
 * role/verification gates identical across both entry points instead of one of
 * them quietly defaulting to the permissive self-host answer.
 */
export async function getServerAuthMode(): Promise<AuthMode> {
  return getAuthMode(await getOptionalEnvValue("AUTH_MODE"));
}

export async function isHostedServerAuthMode(): Promise<boolean> {
  return (await getServerAuthMode()) === "hosted";
}

/**
 * Operator escape hatch: when `HOSTED_ACCESS_OPEN=true`, hosted users get full
 * product access with no paywall and no forced onboarding. Intended for running
 * the managed app before (or without) the billing provider is configured; set
 * back to "false" to re-enable the subscribe gate.
 */
export async function isHostedAccessOpen(): Promise<boolean> {
  return (await getOptionalEnvValue("HOSTED_ACCESS_OPEN")) === "true";
}

/**
 * Whether the billing provider (Autumn) is configured for this deployment.
 *
 * The signal is env PRESENCE of `AUTUMN_SECRET_KEY`: the Autumn client throws on
 * a missing key, so every predicate that would call `autumn.check()` guards on
 * this first and degrades to a closed answer when billing is not set up — rather
 * than letting the throw surface as a 500. This is deliberately a presence check,
 * NOT a try/catch: a present-but-broken key (bad value / provider outage) must
 * still reach Autumn and fail loudly, never be swallowed to "false".
 */
export async function isAutumnConfigured(): Promise<boolean> {
  return Boolean(await getOptionalEnvValue("AUTUMN_SECRET_KEY"));
}

async function getWorkersEnv(): Promise<Record<string, unknown> | null> {
  if (!workersEnvPromise) {
    workersEnvPromise = loadWorkersEnv();
  }
  return workersEnvPromise;
}

async function loadWorkersEnv(): Promise<Record<string, unknown> | null> {
  try {
    const workersModule = await import("cloudflare:workers");
    return isRecord(workersModule.env) ? workersModule.env : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
