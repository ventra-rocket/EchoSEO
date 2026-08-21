// Audit — export, IndexNow and weekly-report panels (owner/admin actions
// taken on an audit target), not covered by audit.ts/auditChrome.ts.
export const auditOps = {
  // Audit — exports (src/client/features/audit/exports/**)
  "audit.exports.heading": "Export",
  "audit.exports.subheading": "current view · one export at a time",
  "audit.exports.reportLanguageLabel": "Report language",
  "audit.exports.startError": "Could not start the export",
  "audit.exports.format.zip": "Issue data (CSV + JSON)",
  "audit.exports.format.pdf": "Report (PDF)",
  "audit.exports.format.doc": "Report (editable)",
  "audit.exports.download": "Download",
  "audit.exports.status.building": "Building…",
  "audit.exports.status.failedDefault": "Failed",
  "audit.exports.status.expired": "Expired",
  "audit.exports.status.issueCount":
    "{count, plural, one {# issue} other {# issues}}",

  // Audit — indexnow (src/client/features/audit/indexnow/**)
  "audit.indexnow.heading": "IndexNow",
  "audit.indexnow.description":
    "Notify participating engines (Bing, Yandex, and others — not Google) that your indexable pages changed. A receipt means accepted, not indexed.",
  "audit.indexnow.setupButton": "Set up IndexNow",
  "audit.indexnow.setupError": "Could not set up IndexNow.",
  "audit.indexnow.hostFileInstructions":
    "Host this file at your domain root, then verify:",
  "audit.indexnow.fileContentsLabel": "File contents:",
  "audit.indexnow.checkVerificationButton": "Check verification",
  "audit.indexnow.verifiedToast": "IndexNow key file verified.",
  "audit.indexnow.notReachableToast":
    "Key file is not reachable at the host yet.",
  "audit.indexnow.verificationFailedError": "Verification failed.",
  "audit.indexnow.submitButton":
    "{count, plural, one {Submit # URL} other {Submit # URLs}}",
  "audit.indexnow.notVerifiedToast":
    "Place the IndexNow key file at your host and verify it before submitting.",
  "audit.indexnow.noUrlsToast": "No indexable URLs to submit for this audit.",
  "audit.indexnow.submittedToast":
    "{count, plural, one {Submitted # URL to IndexNow.} other {Submitted # URLs to IndexNow.}}",
  "audit.indexnow.returnedError": "IndexNow returned {status}.",
  "audit.indexnow.genericError": "an error",
  "audit.indexnow.submissionFailedError": "Submission failed.",
  "audit.indexnow.notReachableNotice":
    "Key file not reachable yet — place it at the host and re-check.",
  "audit.indexnow.recentSubmissionsHeading": "Recent submissions",
  "audit.indexnow.actionSubmittedCount":
    "{count, plural, one {# URL} other {# URLs}}",
  "audit.indexnow.action.succeeded": "succeeded",
  "audit.indexnow.action.failed": "failed",

  // Audit — reports (src/client/features/audit/reports/**)
  "audit.reports.heading": "Weekly report",
  "audit.reports.description":
    "Every Monday at 08:00 (UTC+7) we re-crawl this site, then email what changed — new issues with the exact fix steps first, Search Console numbers underneath. Critical problems are emailed as soon as a crawl finds them, at most once a day.",
  "audit.reports.recipientLabel": "Send the report to",
  "audit.reports.emailPlaceholder": "seo@example.com",
  "audit.reports.askAgainButton": "Ask again",
  "audit.reports.saveButton": "Save",
  "audit.reports.turnOnButton": "Turn on weekly report",
  "audit.reports.pauseButton": "Pause",
  "audit.reports.resumeButton": "Resume",
  "audit.reports.enabledToast":
    "Weekly report is on. The first one goes out Monday.",
  "audit.reports.saveError": "Could not save the report settings.",
  "audit.reports.resumedToast": "Weekly report resumed.",
  "audit.reports.pausedToast": "Weekly report paused.",
  "audit.reports.scheduleError": "Could not change the schedule.",
  "audit.reports.unsubscribedStatus":
    "{email} unsubscribed on {date} · re-enter the address above and save to ask again",
  "audit.reports.activeStatus":
    "Active · crawls up to {maxPages} pages each run",
  "audit.reports.pausedStatus":
    "Paused · no crawl and no email until you resume",
  "audit.reports.lastSentSuffix": " · last sent {date}",
} as const;
