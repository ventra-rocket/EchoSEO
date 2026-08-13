import { AppError } from "@/server/lib/errors";
import type { ErrorCode } from "@/shared/error-codes";

const ACCESS_SIGNALS = [
  "not available",
  "not enabled",
  "not allowed",
  "access denied",
  "forbidden",
  "insufficient",
  "subscription",
  "upgrade",
  "plan",
  "activate your subscription",
  "plans and subscriptions",
];

const BILLING_SIGNALS = [
  "insufficient funds",
  "balance is too low",
  "payment required",
  "billing",
  "balance",
  "problem billing",
  "recharged",
];

/**
 * These sets are consulted with two different numbering schemes, because the
 * classifier is called from two layers: `core.ts` passes the HTTP status, while
 * `envelope.ts` passes DataForSEO's own `status_code`. Both namespaces are
 * listed deliberately.
 *
 * What is *not* listed is a bare HTTP `403`. DataForSEO answers 403 for several
 * unrelated conditions — `40104` (account not verified), `40200`/`40210` (out
 * of funds), `40201` (suspended), `40207` (IP not allowlisted) — and only
 * `40204` actually means the feature is off the subscription. Treating the HTTP
 * status as proof of that turned every one of them into "Backlinks is not
 * enabled for the connected DataForSEO account yet", which sent people to buy a
 * subscription they already had. A real 40204 still classifies here, either on
 * its own code or on the "subscription" text signal below; everything else now
 * falls through to the caller's HTTP ladder, which knows 401/403 as an
 * account-level auth failure.
 */
const ACCESS_STATUS_CODES = new Set([40204]);
const BILLING_STATUS_CODES = new Set([40200, 40210, 402]);

type DataforseoAccessClassifier = (
  status: number | undefined,
  details: string,
  path: string,
) => AppError | null;

export function createDataforseoAccessClassifier(config: {
  pathPrefix: string;
  notEnabledCode: ErrorCode;
  notEnabledMessage: string;
  billingIssueCode: ErrorCode;
  billingIssueMessage: string;
}): DataforseoAccessClassifier {
  return (status, details, path) => {
    if (!path.includes(config.pathPrefix)) return null;

    const text = details.toLowerCase();
    const matchesBillingStatus =
      status != null && BILLING_STATUS_CODES.has(status);
    const matchesBillingText = BILLING_SIGNALS.some((signal) =>
      text.includes(signal),
    );
    if (matchesBillingStatus || matchesBillingText) {
      return new AppError(config.billingIssueCode, config.billingIssueMessage);
    }

    const matchesAccessStatus =
      status != null && ACCESS_STATUS_CODES.has(status);
    const matchesAccessText = ACCESS_SIGNALS.some((signal) =>
      text.includes(signal),
    );
    if (!matchesAccessStatus && !matchesAccessText) return null;

    return new AppError(config.notEnabledCode, config.notEnabledMessage);
  };
}
