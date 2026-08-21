// Strings in shared components under `src/client/components/`. They live here
// rather than being passed in as props with English defaults: a default is what
// lets a caller silently forget and ship English into a Vietnamese page, which
// is the failure this catalog exists to make impossible. A shared component that
// reads its own ids is correct for every feature at once, including the ones
// written after it.
export const common = {
  "common.table.bulkActions": "Bulk actions",
  "common.table.clearSelection": "Clear selection",
  "common.table.selected": "selected",
  "common.table.export": "Export",
  // The accessible name of every sortable column header in the app.
  "common.table.sortBy": "Sort by {label}",
  "common.auth.config.title": "Authentication setup required",
  "common.auth.config.instructions":
    "Check the auth environment variables for your selected {authMode}. Cloudflare Access requires {teamDomain} and {policyAud}. Hosted mode requires {betterAuthSecret} and {betterAuthUrl}.",
  "common.auth.required.title": "Authentication required",
  "common.auth.required.externalInstructions":
    "This deployment uses external authentication. Refresh your access session, then try again.",
  "common.auth.redirectingBilling":
    "Redirecting you to billing so you can start a hosted subscription.",
  "common.action.retry": "Try again",
  "common.action.home": "Home",
  "common.action.back": "Go back",
  "common.action.close": "Close",
  "common.action.openSetupGuide": "Open setup guide",
  "common.error.default": "Something went wrong. Please try again.",
  "common.error.code.unauthenticated": "Please sign in and try again.",
  "common.error.code.authConfigMissing":
    "EchoSEO auth is not configured. Follow the README setup steps for Cloudflare Access.",
  "common.error.code.paymentRequired":
    "An active hosted subscription is required before you can use EchoSEO.",
  "common.error.code.insufficientCredits":
    "You've run out of credits. Add more credits or upgrade your plan to continue.",
  "common.error.code.forbidden": "You do not have access to this resource.",
  "common.error.code.notFound": "The requested resource was not found.",
  "common.error.code.auditCapacityReached":
    "You've reached audit capacity for your account. Delete old audits from your projects to start a new one.",
  "common.error.code.auditVerificationRequired":
    "Crawls over {threshold, number} pages need a Search Console property that covers this domain. Lower Max pages to {threshold, number}, or connect a matching property in Settings.",
  "common.error.code.validation": "Please check your input and try again.",
  "common.error.code.crawlTargetBlocked":
    "This crawl target is blocked by security policy.",
  "common.error.code.backlinksNotEnabled":
    "Backlinks is not enabled for the connected DataForSEO account yet.",
  "common.error.code.backlinksBillingIssue":
    "The connected DataForSEO account has a billing or balance issue.",
  "common.error.code.aiSearchNotEnabled":
    "AI Optimization is not enabled for the connected DataForSEO account yet.",
  "common.error.code.aiSearchBillingIssue":
    "The connected DataForSEO account has a billing or balance issue.",
  "common.error.code.dataforseoAuthFailed":
    "DataForSEO refused the request. Either the API key is wrong, or the DataForSEO account behind it cannot fetch data yet — check both in Settings.",
  "common.error.code.dataforseoKeyMissing":
    "Add your DataForSEO API key in Settings to load keyword, backlink, domain, and rank data.",
  "common.error.code.rateLimited":
    "Too many requests. Please wait and try again.",
  "common.error.code.upstreamUnavailable":
    "The data provider is temporarily unavailable. Please retry in a moment.",
  "common.error.code.targetBehindAuth":
    "That site is behind a login or access gate, so its pages can't be checked.",
  "common.error.code.conflict": "This request conflicts with existing data.",
  "common.error.code.internal":
    "An unexpected error occurred. Please check server logs and try again.",
  "common.notFound.body": "The page you are looking for does not exist.",
  "common.theme.title": "Theme",
  "common.theme.preferenceAria": "Theme preference",
  "common.theme.system": "System",
  "common.theme.light": "Light",
  "common.theme.dark": "Dark",
  "common.location.selectCountry": "Select country",
  "common.location.searchPlaceholder": "Search countries",
  "common.location.noMatches": "No countries match “{query}”",
  "common.table.selectAllRows": "Select all rows",
  "common.table.selectRow": "Select row",
  "common.table.rowsPerPage": "Rows per page",
  "common.table.rangeWithTotal":
    "{start, number}–{end, number} of {total, number}",
  "common.table.page": "Page {page, number}",
  "common.table.pageOf": "Page {page, number} of {totalPages, number}",
  "common.table.previousPage": "Previous page",
  "common.table.nextPage": "Next page",
  "common.sheets.export": "Export to Sheets",
  "common.sheets.copyAndOpenTitle": "Copy table and open a new Google Sheet",
  "common.sheets.copied":
    "Copied {rowCount, plural, one {# row} other {# rows}} to your clipboard",
  "common.sheets.instructions": "Open a new Google Sheet and paste to fill it.",
  "common.sheets.open": "Open new Google Sheet",
} as const;
