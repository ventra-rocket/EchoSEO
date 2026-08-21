// Google Search Console connect surfaces: the Integrations card (also shown on
// the audit Search tab and the Search Performance not-connected state — the
// state most users see, since most projects have no Search Console grant),
// the property picker and its failure copy, the multi-site import modal, the
// re-engagement nudge and the self-hosted setup warning.
export const gsc = {
  // Shared across every connect surface below — reused verbatim rather than
  // duplicated per file, since it is the exact same action in each place.
  "gsc.connectWithGoogle": "Connect with Google",
  "gsc.reconnectWithGoogle": "Reconnect with Google",
  "gsc.disconnect": "Disconnect",
  "gsc.cancel": "Cancel",
  "gsc.tryAgain": "Try again",

  // SearchConsoleConnectionCard.tsx — the Integrations card and its connected
  // summary (ConnectedState).
  "gsc.card.title": "Google Search Console",
  "gsc.card.subtitle": "Your search data, straight from Google.",
  "gsc.card.checking": "Checking…",
  "gsc.card.pitch": "Real clicks, impressions, and rankings. No credits used.",
  "gsc.card.status.connected": "Connected",
  "gsc.card.status.setupRequired": "Setup required",
  "gsc.card.status.notConnected": "Not connected",
  "gsc.card.connectedToast": "Search Console connected",
  "gsc.card.disconnectedToast": "Search Console disconnected",
  "gsc.connectedState.connectedBy": "Connected by {email}",
  "gsc.connectedState.changeProperty": "Change property",

  // SitePicker.tsx — verified-property selector, shared by the Integrations
  // card and the onboarding step. GSC_FAILURE_COPY covers what the user can
  // do about each grant failure; the action itself stays a plain union, not
  // text — "reconnect" only appears where a fresh grant can fix the problem.
  "gsc.sitePicker.loading": "Loading properties…",
  "gsc.sitePicker.propertyLabel": "Property",
  "gsc.sitePicker.selectPlaceholder": "Select a property…",
  "gsc.sitePicker.noAccessSuffix": "  (no access)",
  "gsc.sitePicker.saving": "Saving…",
  "gsc.sitePicker.saveProperty": "Save property",
  "gsc.failure.notConnected":
    "No Google account is connected yet. Connect one to pick a Search Console property.",
  "gsc.failure.consentBlocked":
    "Google refused Search Console access for this account. If your organisation manages the account, an admin has to allow this app; otherwise reconnect and accept the Search Console permission.",
  "gsc.failure.grantExpired": "Connection expired. Reconnect to continue.",
  "gsc.failure.providerError":
    "Search Console did not answer. This is usually a short rate limit — try again in a minute.",

  // GscImportModal.tsx — bulk import, one project per Search Console property.
  "gsc.import.title": "Import from Search Console",
  "gsc.import.description":
    "Each property becomes its own project, connected to that property — which is what lets its Search Console numbers, audits and reports be about one site.",
  "gsc.import.loadError": "Could not read your Search Console properties.",
  "gsc.import.empty": "This Google account has no Search Console properties.",
  "gsc.import.clearSelection": "Clear selection",
  "gsc.import.selectAll": "Select all {count}",
  "gsc.import.selectedCount": "{count} selected",
  "gsc.import.block.alreadyImported": "Already imported",
  "gsc.import.block.unverified": "Not verified for you",
  "gsc.import.block.unsupported": "Cannot be crawled",
  "gsc.import.block.pathScoped": "Scoped to a path",
  "gsc.import.candidate.kind.domain": "Domain property",
  "gsc.import.candidate.kind.urlPrefix": "URL-prefix property",
  "gsc.import.candidate.propertyMeta": "{kind} · project {host}",
  // Written 20/08 to stop the product promising Search Console data it will
  // never return: a URL-prefix property scoped to a path only ever reports on
  // that one path, so importing it as if it covered the whole origin would
  // ship an empty Search Performance tab with no explanation. A translation
  // must keep both halves — the reason (Search Console's own limit) and the
  // fix (which property kinds do cover the origin) — not soften it into a
  // bare "cannot be imported".
  "gsc.import.candidate.pathScopedReason":
    "Search Console reports only on this property's own path — connect a Domain property or a root-prefix property to import this site",
  "gsc.import.candidate.notCrawlable": "Not a site this app can crawl",
  "gsc.import.startAudits.label": "Run a first crawl on each imported site",
  "gsc.import.startAudits.hint":
    "Crawls start one at a time. Past the hourly launch limit the remaining sites are still imported and say so.",
  "gsc.import.submitError": "Could not import those properties.",
  "gsc.import.submitButton": "Import",
  "gsc.import.submitButtonCount": "Import {count}",
  "gsc.import.outcome.title": "Import result",
  "gsc.import.outcome.created": "Project {host} created",
  "gsc.import.outcome.duplicate": "Already imported — left alone",
  "gsc.import.outcome.failedDefault": "Could not be imported",
  "gsc.import.outcome.auditStarted": " · first crawl running",
  "gsc.import.outcome.auditThrottled":
    " · crawl not started: hourly limit reached",
  "gsc.import.outcome.auditUnavailable":
    " · crawl not started for this workspace",
  "gsc.import.outcome.done": "Done",
  "gsc.import.reconnectPrompt.body":
    "Your Google connection can no longer reach Search Console. Reconnect it and the property list comes back.",
  "gsc.import.reconnectPrompt.button": "Reconnect Google",

  // GscReEngagementModal.tsx — one-time hosted-only nudge for users who
  // finished onboarding before the Search Console step existed.
  "gsc.reEngagement.title": "New: Connect Google Search Console",
  "gsc.reEngagement.body":
    "Bring your real clicks, impressions, and rankings into EchoSEO and query them from Claude or Codex over MCP. It never uses credits.",
  "gsc.reEngagement.maybeLater": "Maybe later",

  // SelfHostedSetupWarning.tsx — shown in self-hosted deployments that have
  // not set GOOGLE_CLIENT_ID/SECRET yet.
  "gsc.selfHosted.title": "Google OAuth client not configured",
  "gsc.selfHosted.body":
    "Add your Google client ID and secret to this EchoSEO deployment before connecting Search Console.",
  "gsc.selfHosted.setupGuideLabel": "Open setup guide",

  // startGscLink.ts reads this id directly from the catalog: it is a plain
  // async function shared by four call sites, not a component or a hook, so
  // it has no useIntl(). Matches the common.ts shared-component approach — a
  // caller-supplied fallback string is what lets a caller forget to localize.
  "gsc.startLink.error": "Could not start Google sign-in",
} as const;
