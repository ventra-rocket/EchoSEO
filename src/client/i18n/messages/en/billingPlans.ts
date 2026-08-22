// Billing route and the subscribe interstitial.
export const billingPlans = {
  // BillingPage / SubscribePage shared "Billing unavailable" error state
  // (billing.tsx, subscribe.tsx) and the "Try again" button reuses
  // common.action.retry.
  "billingPlans.error.title": "Billing unavailable",
  "billingPlans.error.loadFailed":
    "We couldn't load your billing details right now. Please try again.",

  // billing.tsx route.
  "billingPlans.page.title": "Billing",
  "billingPlans.pending.redirectingStripe": "Redirecting to Stripe...",
  "billingPlans.credits.remaining": "{amount} remaining",
  "billingPlans.credits.monthlyAmount": "Monthly {amount}",
  "billingPlans.credits.topupAmount": "Top-ups {amount}",
  "billingPlans.credits.outOfCreditsFree":
    "You’ve used all your credits. Upgrade your plan to continue.",
  "billingPlans.credits.outOfCreditsPaid":
    "You’ve used all your credits. Buy more credits below to continue.",
  "billingPlans.credits.lowFree":
    "You’re running low on credits. Upgrade to get {amount}/month.",
  "billingPlans.credits.lowPaid":
    "You’re running low on credits. Buy more credits below.",
  "billingPlans.plan.label": "Plan",
  "billingPlans.plan.free": "Free Plan",
  // Reused by subscribe.tsx's plan card — same plan, same name.
  "billingPlans.plan.base": "Base Plan",
  // Reused by subscribe.tsx's plan card price.
  "billingPlans.plan.priceLabel": "{amount}/month",
  "billingPlans.plan.featureAllAccess": "Access to all EchoSEO features",
  // Reused by subscribe.tsx's PLAN_FEATURES list — identical fact, one id.
  "billingPlans.plan.featureCredits":
    "Includes {amount} of Usage Credits each month",
  "billingPlans.plan.upgradeButton": "Upgrade Plan",
  "billingPlans.plan.manageButton": "Manage subscription",
  // Reused by subscribe.tsx's handleSubscribe fallback — identical fact.
  "billingPlans.checkout.startError":
    "We couldn't start the checkout. Please try again.",
  "billingPlans.portal.openError":
    "We couldn't open the billing portal. Please try again.",
  "billingPlans.topup.title": "Buy credits",
  "billingPlans.topup.description":
    "Top-up credits never expire and are used after your monthly credits.",
  "billingPlans.topup.rangeHint": "Enter between {min}–{max}.",
  "billingPlans.topup.buyButton": "Buy credits",
  "billingPlans.footer.poweredByStripe": "Billing is powered by Stripe.",

  // BillingUsageChart.tsx / BillingFeatureBreakdown.tsx — both usage panels
  // share the "Last 30 days" / empty-state copy.
  "billingPlans.usage.title": "Usage",
  "billingPlans.usage.last30Days": "Last 30 days",
  "billingPlans.usage.noneRecorded": "No usage recorded yet",
  "billingPlans.usage.byFeatureTitle": "Usage by feature",

  // BillingFeatureBreakdown.tsx — per-feature credit spend labels. Mirrors
  // every key CREDIT_FEATURE_LABELS (src/shared/billing-credit-features.ts)
  // can produce, including "ai_search" and the "Other" fallback for legacy
  // or unmapped events; that shared map stays English (server/analytics
  // facing), this catalog is what actually renders.
  "billingPlans.creditFeature.keywordResearch": "Keyword Research",
  "billingPlans.creditFeature.domainOverview": "Domain Overview",
  "billingPlans.creditFeature.backlinks": "Backlinks",
  "billingPlans.creditFeature.siteAudit": "Site Audit",
  "billingPlans.creditFeature.rankTracking": "Rank Tracking",
  "billingPlans.creditFeature.aiCitations": "AI Citations",
  "billingPlans.creditFeature.aiPromptResponses": "AI Prompt Responses",
  "billingPlans.creditFeature.aiSearch": "AI Search",
  "billingPlans.creditFeature.localSeo": "Local SEO",
  "billingPlans.creditFeature.onboarding": "Onboarding",
  "billingPlans.creditFeature.issueExplainer": "Issue Explainer",
  "billingPlans.creditFeature.other": "Other",

  // FreePlanBanner.tsx — only mounts in hosted mode (route.tsx gates on
  // authGate.isHostedMode), unreachable in a self-hosted/local dev build.
  "billingPlans.freeBanner.buyMoreCreditsLink": "Buy more credits",
  "billingPlans.freeBanner.outOfCredits":
    "You’ve used all your credits. {link} to continue using EchoSEO.",
  "billingPlans.freeBanner.lowCredits":
    "You’re running low on credits. {link} to keep using EchoSEO.",
  "billingPlans.freeBanner.enjoying":
    "We hope you’re enjoying EchoSEO! <upgradeLink>Upgrade anytime</upgradeLink> or <supportLink>reach out with questions</supportLink>.",

  // subscribe.tsx — the paywall/interstitial page.
  // Reused by FreePlanBanner's isFreePlan out-of-credits/low-credits link —
  // same fact ("go upgrade"), same words.
  "billingPlans.subscribe.upgradeTitle": "Upgrade your plan",
  "billingPlans.subscribe.welcomeNamed": "Welcome to EchoSEO, {firstName}!",
  "billingPlans.subscribe.welcome": "Welcome to EchoSEO!",
  "billingPlans.subscribe.tagline":
    "SEO on your terms. All your SEO tools in one place at a fair price.",
  "billingPlans.plan.featureCore":
    "Keyword research, backlinks, rank tracking, and site audits",
  "billingPlans.plan.featureMcp":
    "MCP server and agent skills for Claude, Cursor, and ChatGPT",
  "billingPlans.plan.featureGsc":
    "Search Console integration that never uses credits",
  "billingPlans.subscribe.subscribeButton": "Subscribe",
  "billingPlans.subscribe.redirecting": "Redirecting...",
  "billingPlans.subscribe.error.verifyFailed":
    "We couldn't verify your billing status right now. Please try again.",
  "billingPlans.subscribe.guaranteeSentence":
    "<tooltip>30-day money-back guarantee</tooltip>. Cancel anytime. Powered by Stripe.",
  "billingPlans.subscribe.guaranteeTooltip":
    "Not for you yet? Email {email} within 30 days of your charge and we'll refund your subscription.",
  "billingPlans.subscribe.questionsPrompt":
    "Questions? <link>Email {email}</link>.",
  "billingPlans.subscribe.backToApp": "Back to app",
  "billingPlans.finalizing.title": "Finalizing your subscription…",
  "billingPlans.finalizing.hint": "This usually takes a few seconds.",
  "billingPlans.finalizing.supportPrompt":
    "Taking longer? <link>Email {email}</link>.",

  // SubscribePageAccountMenu — the compact account menu on the standalone
  // subscribe/paywall page (outside the main app shell, so it doesn't reuse
  // shell.ts's own account.* ids).
  "billingPlans.accountMenu.openAria": "Open account menu",
  "billingPlans.accountMenu.settingsLink": "Settings",
  "billingPlans.accountMenu.signOut": "Sign out",
} as const;
