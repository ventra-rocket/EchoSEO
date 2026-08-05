import { isHostedAuthMode } from "@/lib/auth-mode";

let workersEnvPromise: Promise<Record<string, unknown> | null> | null = null;

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
  return typeof workerValue === "string" ? workerValue : undefined;
}

export async function getRequiredEnvValue(name: string): Promise<string> {
  const value = await getOptionalEnvValue(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function isHostedServerAuthMode(): Promise<boolean> {
  return isHostedAuthMode(await getOptionalEnvValue("AUTH_MODE"));
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
