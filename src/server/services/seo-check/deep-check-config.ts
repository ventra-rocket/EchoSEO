/**
 * Runtime configuration for the Free Deep SEO Check — abuse/quota gates and the
 * retention windows.
 *
 * Values come from Worker env with conservative defaults, so an operator can
 * retune limits, hit the kill-switch, or change a retention window without a
 * code deploy. Reads go through runtime-env (process.env in Node, else the
 * cloudflare:workers env).
 */
import { getOptionalEnvValue } from "@/server/lib/runtime-env";

/** Rolling window for the daily quotas (reuses the fixed-window rate-limit DO). */
export const DEEP_CHECK_WINDOW_MS = 24 * 60 * 60 * 1000;

const DEFAULT_PSI_DAILY_CEILING = 200;
const DEFAULT_PER_DOMAIN_DAILY = 3;
const DEFAULT_PER_EMAIL_DAILY = 5;

/** Days a finished report (and its lead's PII) is kept, from its finish time. */
const DEFAULT_REPORT_RETENTION_DAYS = 30;
/**
 * Days a never-confirmed lead is kept after its confirm token expires.
 *
 * Consent was never given, so there is no basis to keep the address; the grace
 * only covers the "I clicked the link and it said expired" support case.
 */
const DEFAULT_UNCONFIRMED_GRACE_DAYS = 7;

async function readPositiveInt(
  name: string,
  fallback: number,
): Promise<number> {
  const raw = await getOptionalEnvValue(name);
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Kill-switch: `FREE_DEEP_CHECK_DISABLED=true` pauses the whole deep pipeline. */
export async function isDeepCheckDisabled(): Promise<boolean> {
  return (await getOptionalEnvValue("FREE_DEEP_CHECK_DISABLED")) === "true";
}

interface DeepCheckLimits {
  psiDailyCeiling: number;
  perDomainDaily: number;
  perEmailDaily: number;
}

export async function getDeepCheckLimits(): Promise<DeepCheckLimits> {
  const [psiDailyCeiling, perDomainDaily, perEmailDaily] = await Promise.all([
    readPositiveInt("DEEP_CHECK_PSI_DAILY_CEILING", DEFAULT_PSI_DAILY_CEILING),
    readPositiveInt("DEEP_CHECK_PER_DOMAIN_DAILY", DEFAULT_PER_DOMAIN_DAILY),
    readPositiveInt("DEEP_CHECK_PER_EMAIL_DAILY", DEFAULT_PER_EMAIL_DAILY),
  ]);
  return { psiDailyCeiling, perDomainDaily, perEmailDaily };
}

interface RetentionWindows {
  reportRetentionDays: number;
  unconfirmedGraceDays: number;
}

export async function getRetentionWindows(): Promise<RetentionWindows> {
  const [reportRetentionDays, unconfirmedGraceDays] = await Promise.all([
    readPositiveInt("FREE_CHECK_RETENTION_DAYS", DEFAULT_REPORT_RETENTION_DAYS),
    readPositiveInt(
      "FREE_CHECK_UNCONFIRMED_GRACE_DAYS",
      DEFAULT_UNCONFIRMED_GRACE_DAYS,
    ),
  ]);
  return { reportRetentionDays, unconfirmedGraceDays };
}
