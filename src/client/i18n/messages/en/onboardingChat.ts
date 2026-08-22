// Onboarding strategy chat surface: shell, conversation, composer, credit limits and site-save flow.
export const onboardingChat = {
  // Outer shell (OnboardingChat.tsx) — strategy state load error / loading.
  "onboardingChat.shell.loadError":
    "Couldn’t load your strategy. Please refresh to try again.",
  "onboardingChat.shell.loading": "Loading…",

  // First-run site form (OnboardingChat.tsx SiteForm) — shown before a project
  // has a domain, so this is the very first screen a new hosted signup sees.
  "onboardingChat.siteForm.title": "Tell us about your website.",
  "onboardingChat.siteForm.subtitle":
    "If you have multiple websites, you can set that up later.",
  "onboardingChat.siteForm.domainLabel": "Your website",
  "onboardingChat.siteForm.domainPlaceholder": "example.com",
  "onboardingChat.siteForm.locationLabel":
    "This is the country we will use when getting SEO data.",
  "onboardingChat.siteForm.saving": "Saving…",
  "onboardingChat.siteForm.submit": "Continue",
  "onboardingChat.siteForm.saveErrorDefault":
    "We couldn’t save your site. Please try again.",

  // Welcome message (OnboardingChatParts.tsx WelcomeMessage) — Sam's first
  // turn, plus the mobile-only inline upgrade callout under it.
  "onboardingChat.welcome.greeting": "Hey, I’m Sam — welcome to EchoSEO.",
  "onboardingChat.welcome.upgradeExplainer":
    "To get full access to EchoSEO, you need to upgrade to the paid plan. But, I’m here if you have any questions.",
  "onboardingChat.welcome.helpLinks":
    "You can also <discordLink>join the Discord</discordLink> or email <emailLink>ventrarocket.work@gmail.com</emailLink> if you have any questions I can’t help you with.",
  "onboardingChat.welcome.analyzePrompt":
    "Want me to analyze {domain} and draft a strategy, or do you have questions first? Pick one below to get started.",
  "onboardingChat.welcome.mobileCalloutTitle": "Want Sam to keep going?",
  "onboardingChat.welcome.mobileCalloutBody":
    "Upgrade to run keyword research, rank tracking, and site audits on {domain}.",

  // Shared upgrade CTA copy, reused across the welcome callout, the sidebar and
  // the post-limit gate below.
  "onboardingChat.upgrade.redirecting": "Redirecting...",
  "onboardingChat.upgrade.cta": "Upgrade",
  "onboardingChat.upgrade.ctaFull": "Upgrade to continue",

  // Upgrade sidebar (OnboardingChatParts.tsx UpgradeSidebar) — desktop-only
  // left rail with the plan pitch and the free-question progress bar.
  "onboardingChat.upgrade.feature.core":
    "Keyword research, backlinks, rank tracking & site audits",
  "onboardingChat.upgrade.feature.gsc":
    "Google Search Console — read-only, no credits, no Google Cloud setup",
  "onboardingChat.upgrade.feature.mcp":
    "Connect Claude, Cursor, Codex & other MCP clients",
  "onboardingChat.upgrade.feature.creditsRollover":
    "Top-up credits roll over and never expire",
  "onboardingChat.upgrade.previewingLabel": "Previewing EchoSEO",
  "onboardingChat.upgrade.perMonthSuffix": "/month",
  "onboardingChat.upgrade.priceIncludes":
    "Includes {price} of usage credits every month, plus a 30-day money-back guarantee.",
  "onboardingChat.upgrade.discordPrompt":
    "Want advice from other EchoSEO users? <discordLink>Join the Discord</discordLink>.",
  "onboardingChat.upgrade.questionsUsed":
    "{used, number} of {limit, plural, one {# free question} other {# free questions}} used",

  // Post-limit composer replacement (OnboardingChatParts.tsx ChatGate).
  "onboardingChat.gate.allQuestionsUsed":
    "That’s all {limit, plural, one {# free question} other {# free questions}}",
  "onboardingChat.gate.description":
    "Upgrade to keep working with Sam and unlock the full EchoSEO app.",
  "onboardingChat.gate.moneyBackGuarantee": "30-day money-back guarantee",

  // Composer (OnboardingChatParts.tsx ChatComposer) and the "N free questions
  // left" hint rendered just above it in OnboardingChatConversation.tsx.
  "onboardingChat.composer.placeholder":
    "Ask Sam about your strategy or EchoSEO…",
  "onboardingChat.composer.sendAriaLabel": "Send message",
  "onboardingChat.composer.remainingHint":
    "{remaining, plural, one {# free question left.} other {# free questions left.}} <upgradeLink>Upgrade for full access</upgradeLink>",

  // Reasoning block (OnboardingChatConversation.tsx ReasoningBlock) — the
  // collapsed "thinking" trace above the assistant's answer.
  "onboardingChat.reasoning.thinking": "Thinking…",
  "onboardingChat.reasoning.thoughtProcess": "Thought process",

  // Tool badges (OnboardingChatConversation.tsx ToolBadge) — one running/done
  // label pair per tool Sam can call, shown inline in the assistant bubble.
  "onboardingChat.tool.readWebsite.running": "Reading site…",
  "onboardingChat.tool.readWebsite.done": "Read site",
  "onboardingChat.tool.seoMetrics.running": "Getting SEO metrics…",
  "onboardingChat.tool.seoMetrics.done": "SEO metrics",
  "onboardingChat.tool.researchKeywords.running": "Researching keywords…",
  "onboardingChat.tool.researchKeywords.done": "Keyword research",
  "onboardingChat.tool.domainOverview.running": "Analyzing domain…",
  "onboardingChat.tool.domainOverview.done": "Domain overview",
  "onboardingChat.tool.serpResults.running": "Checking search results…",
  "onboardingChat.tool.serpResults.done": "Search results",
  "onboardingChat.tool.competitors.running": "Finding competitors…",
  "onboardingChat.tool.competitors.done": "Competitors",
  "onboardingChat.tool.competitorKeywords.running": "Analyzing competitor…",
  "onboardingChat.tool.competitorKeywords.done": "Competitor keywords",
  "onboardingChat.tool.backlinksOverview.running": "Checking backlinks…",
  "onboardingChat.tool.backlinksOverview.done": "Backlinks overview",

  // Suggested-question chips (OnboardingChatConversation.tsx). The chip text
  // doubles as the message sent to Sam when clicked, so translating it changes
  // what gets sent — intentional, matching what the user would type themselves.
  "onboardingChat.suggestion.strategy": "What do you recommend for my site?",
  "onboardingChat.suggestion.competitors": "Compare against my competitors",
  "onboardingChat.suggestion.traffic":
    "How will EchoSEO help me get more traffic?",
  "onboardingChat.suggestion.compareClaude": "Compare EchoSEO and Claude",
  "onboardingChat.suggestion.afterUpgrade": "What do I get after I upgrade?",
  "onboardingChat.suggestion.gscIntegration":
    "How does the Google Search Console integration work?",
  "onboardingChat.suggestion.agencyFit":
    "Right fit for consultants and agencies?",

  // Conversation-level failures (OnboardingChatConversation.tsx).
  "onboardingChat.conversation.checkoutErrorDefault":
    "We couldn’t start checkout. Please refresh and try again.",
  "onboardingChat.conversation.genericError":
    "Something went wrong. Please refresh and try again.",
} as const;
