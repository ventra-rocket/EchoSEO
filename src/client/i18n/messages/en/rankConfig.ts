// Rank tracking domains, config modal, schedule, keyword add flow and the cost/plan notices.
export const rankConfig = {
  // The route-level page subtitle. Its heading reuses `nav.rankTracking`, so
  // only the sentence under it needs an id of its own.
  "rank.page.subtitle": "Track keyword positions across domains",

  // Shared actions/labels reused across the domain list, config modal, check
  // modal and keyword-add flow — one id per literal string avoids five
  // "Cancel"s drifting out of sync with each other.
  "rank.config.action.cancel": "Cancel",
  "rank.config.action.addDomain": "Add Domain",

  // Device and schedule labels shown compactly (domain list row, detail header
  // summary line, and the desktop/mobile view toggle). The config form uses
  // its own longer copy below because "Desktop only" reads better as a select
  // option than as an inline summary — see rank.config.form.deviceOnly.*.
  "rank.config.device.both": "Desktop + Mobile",
  "rank.config.device.desktop": "Desktop",
  "rank.config.device.mobile": "Mobile",
  "rank.config.schedule.daily": "Daily",
  "rank.config.schedule.weekly": "Weekly",
  "rank.config.schedule.monthly": "Monthly",
  "rank.config.schedule.manual": "Manual",

  // Rank tracking — domain list (RankTrackingDomainList.tsx)
  "rank.config.domainList.heading": "Tracked Domains",
  "rank.config.domainList.empty.title": "No tracked domains yet",
  "rank.config.domainList.empty.body":
    "Add a domain to start monitoring keyword rankings over time.",
  "rank.config.domainList.filterEmpty.title": "No matching tracked domains",
  "rank.config.domainList.filterEmpty.body":
    "Try clearing search or adjusting filters.",
  "rank.config.domainList.filterEmpty.clear": "Clear filters",
  "rank.config.domainList.archiveModal.title": "Archive {domain}?",
  "rank.config.domainList.archiveModal.body":
    "Scheduled checks will stop and this domain will be hidden from the list. Ranking history is preserved.",
  "rank.config.domainList.archiveModal.confirm": "Archive",
  "rank.config.domainList.archiveToast": "Domain archived",
  "rank.config.domainList.row.openAria": "Open {domain}",
  "rank.config.domainList.row.archiveTitle": "Archive domain",
  "rank.config.domainList.row.creditsSkipped":
    "Scheduled check skipped — insufficient credits",
  "rank.config.domainList.row.keywordsLabel": "Keywords",
  // Leading space: appended directly after the schedule label with no other
  // separator, same convention as audit.progress.lighthouseFailedSuffix.
  "rank.config.summary.paused": " (paused)",
  "rank.config.summary.lastRunSuffix": " · Last: {date}",

  // Rank tracking — domain detail page + header (RankTrackingDomainDetail.tsx,
  // RankTrackingDetailHeader.tsx)
  "rank.config.detail.backToDomains": "Back to domains",
  // Shown by the `$configId` route when the id in the URL matches no config —
  // a shared or stale link, so it needs the way back beside it.
  "rank.config.detail.notFound": "Domain configuration not found.",
  "rank.config.detail.creditsSkippedAlert":
    "Last scheduled check was skipped due to insufficient credits. Top up your balance to resume automatic tracking.",
  "rank.config.detail.staleRunAlert":
    "This run may be unresponsive and will be cleaned up automatically.",
  "rank.config.detail.lastCheckFailed": "Last check failed: {error}",
  "rank.config.detail.comparePeriod.title": "Comparison period",
  "rank.config.detail.comparePeriod.1d": "vs yesterday",
  "rank.config.detail.comparePeriod.7d": "vs last week",
  "rank.config.detail.comparePeriod.30d": "vs last month",
  "rank.config.detail.comparePeriod.90d": "vs 90 days ago",
  "rank.config.detail.configure": "Configure",
  "rank.config.detail.addKeywords": "Add Keywords",
  "rank.config.detail.costPerCheck": "~{amount}/check",
  "rank.config.detail.addKeywordsFirstToast":
    'Add keywords first — use "Add Keywords" above.',
  "rank.config.detail.checkNowUseMenuToast":
    'Use "Check rankings" in the ⋯ menu to check these keywords',
  "rank.config.detail.keywordsCopiedToast": "Keywords copied to clipboard",
  "rank.config.detail.keywordsAddedToast":
    "{count, plural, one {# keyword added} other {# keywords added}}",

  // Rank tracking — config modal (RankTrackingConfigModal.tsx,
  // ScheduledRunsField.tsx)
  "rank.config.modal.editTitle": "Edit Domain Config",
  "rank.config.modal.saveChanges": "Save Changes",
  "rank.config.form.domainLabel": "Target Domain",
  "rank.config.form.domainPlaceholder": "example.com",
  "rank.config.form.countryLabel": "Country",
  "rank.config.form.languageLabel": "Language",
  "rank.config.form.devicesLabel": "Devices",
  "rank.config.form.deviceOnly.desktop": "Desktop only",
  "rank.config.form.deviceOnly.mobile": "Mobile only",
  "rank.config.form.devicesHint":
    "Most Google searches come from mobile, but select this based on your customer.",
  "rank.config.form.devicesBothInfo":
    "Tracking both devices uses 2x credits per keyword check",
  "rank.config.form.scheduleLabel": "Schedule",
  "rank.config.form.scheduleMonthly": "Monthly (end of month)",
  "rank.config.form.scheduleManualOnly": "Manual only",
  "rank.config.form.scheduleDailyInfo":
    "Daily checks use 7x more credits than weekly",
  "rank.config.form.depthLabel": "Search Depth",
  "rank.config.form.depthOption":
    "{pages, plural, one {# page} other {# pages}} (top {results} results)",
  "rank.config.form.depthHint": "10 pages is ~8x more expensive than 1 page",
  "rank.config.form.domainRequiredToast": "Please enter a domain",
  "rank.config.form.domainInvalidToast": "Please enter a valid domain",
  "rank.config.form.createSuccessToast": "Domain added for rank tracking",
  "rank.config.form.createErrorDefault": "Failed to save config",
  "rank.config.form.updateSuccessToast": "Configuration updated",
  "rank.config.form.updateErrorDefault": "Failed to update config",
  "rank.config.scheduledRuns.createHint":
    "Automatic checks start off. Add the domain, then turn them on from Configure when you're ready to spend on this schedule.",
  "rank.config.scheduledRuns.toggleLabel": "Run checks automatically",
  "rank.config.scheduledRuns.enabledHint":
    "Checks run on the schedule above and bill your DataForSEO key without asking.",
  "rank.config.scheduledRuns.disabledHint":
    "Checks only run when you start them yourself.",

  // Rank tracking — check confirm modal (CheckConfirmModal.tsx)
  "rank.config.checkModal.title":
    "Check {count, plural, one {# keyword} other {# keywords}}",
  "rank.config.checkModal.subtitle":
    "{count, plural, one {# keyword} other {# keywords}} × {deviceCount, plural, one {# device} other {# devices}} = {totalChecks, plural, one {# SERP check} other {# SERP checks}}",
  "rank.config.checkModal.runNow": "Run Now",
  "rank.config.checkModal.etaSeconds": "Results in ~{seconds}s",
  "rank.config.checkModal.etaMinutes": "Results in ~{minutes} min",
  "rank.config.checkModal.cost": "~{amount}",

  // Rank tracking — cost estimate note (CostEstimateNote.tsx)
  "rank.config.costNote.perKeyword": "~{amount} per keyword per check",
  "rank.config.costNote.monthlyEstimate":
    "50 keywords would cost ~{amount}/month",

  // Rank tracking — free plan alert (FreePlanAlert.tsx)
  "rank.config.freePlan.body":
    "We only start to track keyword positions once you <link>upgrade to the paid plan</link>.",

  // Rank tracking — add keywords panel + suggestion step (AddKeywordsPanel.tsx,
  // KeywordSuggestionStep.tsx)
  "rank.config.addKeywords.placeholder": "Enter keywords, one per line",
  "rank.config.addKeywords.add": "Add",
  "rank.config.addKeywords.errorDefault": "Failed to add keywords",
  // Covers duplicate-of-existing, duplicate-within-paste, and over-the-limit
  // alike: the server collapses all three into one silently-dropped count, so
  // this can't claim more precision than that without a server change.
  "rank.config.addKeywords.skippedToast":
    "{skipped, plural, one {# keyword wasn't added — already tracked or over the limit} other {# keywords weren't added — already tracked or over the limit}}",
  "rank.config.keywordSuggestions.column.keyword": "Keyword",
  "rank.config.keywordSuggestions.column.keywordTooltip":
    "The search term this domain ranks for",
  "rank.config.keywordSuggestions.column.position": "Position",
  "rank.config.keywordSuggestions.column.positionTooltip":
    "Current Google ranking position",
  "rank.config.keywordSuggestions.column.volume": "Volume",
  "rank.config.keywordSuggestions.column.volumeTooltip":
    "Monthly search volume",
  "rank.config.keywordSuggestions.column.traffic": "Traffic",
  "rank.config.keywordSuggestions.column.trafficTooltip":
    "Estimated monthly organic traffic",
  "rank.config.keywordSuggestions.title.manual": "Add keywords manually",
  "rank.config.keywordSuggestions.title.loading":
    "Finding your top keywords...",
  "rank.config.keywordSuggestions.title.error": "Couldn't fetch keywords",
  "rank.config.keywordSuggestions.title.empty": "No rankings found",
  "rank.config.keywordSuggestions.title.choose": "Choose keywords to track",
  "rank.config.keywordSuggestions.notSupportedBody":
    "Ranked-keyword suggestions aren't available for this country. Continue and add the keywords you want to track manually.",
  "rank.config.keywordSuggestions.continue": "Continue",
  "rank.config.keywordSuggestions.loadingHint":
    "This usually takes a few seconds",
  "rank.config.keywordSuggestions.errorBody":
    "You can skip this step and add keywords manually later.",
  "rank.config.keywordSuggestions.skip": "Skip",
  "rank.config.keywordSuggestions.emptyBody":
    "We couldn't find any keywords {domain} currently ranks for. You can add keywords manually.",
  "rank.config.keywordSuggestions.foundSummary":
    "We found {count, plural, one {# keyword} other {# keywords}} {domain} ranks for.",
  "rank.config.keywordSuggestions.selectedCount":
    "{selected} of {total} selected",
  "rank.config.keywordSuggestions.saveKeywords":
    "{count, plural, one {Save Keyword} other {Save Keywords}}",
  "rank.config.keywordSuggestions.addedToast":
    "{count, plural, one {Added # keyword for tracking} other {Added # keywords for tracking}}",

  // Rank tracking — metrics refresh + check trigger hooks
  // (useMetricsRefresh.ts, useRankCheckTrigger.ts). These are plain `.ts`
  // hooks, not components — no JSX, but the toasts they fire are still
  // user-visible prose and belong beside their only caller's other strings.
  "rank.config.metricsRefresh.successToast":
    "{count, plural, one {Metrics updated for # keyword} other {Metrics updated for # keywords}}",
  "rank.config.metricsRefresh.errorToast": "Failed to refresh keyword metrics",
  "rank.config.checkTrigger.alreadyRunning": "A rank check is already running",
  "rank.config.checkTrigger.started": "Rank check started",
  "rank.config.checkTrigger.errorDefault": "Failed to start rank check",
} as const;
