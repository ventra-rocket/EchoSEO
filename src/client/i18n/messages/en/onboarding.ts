// Post-signup onboarding form: interest/work/source steps, the Search Console connect step, and the account menu.
export const onboarding = {
  // PostSignupOnboarding.tsx — progress label and the step-0 welcome header.
  // `title`/`helperText` can override the header from the route for
  // returning users (_authenticated.onboarding.index.tsx); that route file is
  // out of this catalog's scope, so its own copy is not translated here.
  "onboarding.progress.step": "Step {step, number} of {total, number}",
  "onboarding.welcome.title": "Welcome to EchoSEO!",
  "onboarding.welcome.namedTitle": "Welcome to EchoSEO, {firstName}!",
  "onboarding.welcome.helper": "A few quick answers to set things up.",

  // PostSignupOnboarding.tsx — the one-time "you're in" interstitial shown
  // right after a successful checkout redirect (?checkout=success), before
  // the GSC step itself renders.
  "onboarding.upgrade.title": "You’re in! 🎉",
  "onboarding.upgrade.subtitle": "Your subscription’s active.",
  "onboarding.upgrade.cardTitle": "Finish setting up your account",
  "onboarding.upgrade.cardBody":
    "Two quick steps left — connect Google Search Console, then set up MCP for your agent.",

  // PostSignupOnboarding.tsx — step navigation. Shared by the wizard footer
  // and McpRecommendation's own back button; same word, same action.
  "onboarding.action.back": "Back",
  "onboarding.action.skip": "Skip",
  "onboarding.action.continue": "Continue",

  // PostSignupOnboarding.tsx — step 0 (interests), step 1 (who for) and its
  // client-site-count follow-up (only asked when workFor === CLIENT_WORK_FOR),
  // step 2 (source).
  "onboarding.step.interests.title": "What tasks matter to you most?",
  "onboarding.step.interests.description": "Pick up to {max, number}.",
  "onboarding.step.workFor.title": "Who are you doing SEO for?",
  "onboarding.step.workFor.clientCountLabel":
    "About how many client sites do you work on?",
  "onboarding.step.source.title": "How did you find EchoSEO?",

  // PostSignupOnboarding.tsx — free-text input shown once a step's "Other"
  // option is picked. Wording differs by whether the step is multi-select.
  "onboarding.otherInput.placeholderMultiple": "Tell us what else...",
  "onboarding.otherInput.placeholderSingle": "Tell us more...",

  // Option labels. onboardingModel.ts's INTEREST_OPTIONS / WORK_FOR_OPTIONS /
  // CLIENT_WEBSITE_COUNT_OPTIONS / SOURCE_OPTIONS keep the exact English
  // string written to the DB — these ids are only the on-screen label a
  // stored value maps to, via the *_OPTION_LABELS lookups in that file.
  // "Other" is one shared id: the same literal value and the same word ends
  // three of the four lists.
  "onboarding.option.other": "Other",
  "onboarding.option.aiWorkflows": "AI workflows with Claude or Codex (MCP)",
  "onboarding.option.keywordResearch": "Keyword research",
  "onboarding.option.competitorResearch": "Competitor research",
  "onboarding.option.backlinkAnalysis": "Backlink analysis",
  "onboarding.option.siteAudits": "Site audits",
  "onboarding.option.rankTracking": "Rank tracking",
  "onboarding.option.ownBusiness": "My own startup or business",
  "onboarding.option.clients": "My clients",
  "onboarding.option.employer": "My employer's website",
  "onboarding.option.sideProject": "My own side project",
  "onboarding.option.exploring": "I'm exploring before choosing a project",
  "onboarding.option.websiteCount1to3": "1–3",
  "onboarding.option.websiteCount4to10": "4–10",
  "onboarding.option.websiteCount11to25": "11–25",
  "onboarding.option.websiteCount25plus": "25+",
  "onboarding.option.sourceGoogle": "Google",
  "onboarding.option.sourceReddit": "Reddit",
  "onboarding.option.sourceTwitter": "X / Twitter",
  "onboarding.option.sourceGithub": "GitHub",
  "onboarding.option.sourceChatgpt": "ChatGPT",
  "onboarding.option.sourceClaude": "Claude",
  "onboarding.option.sourceFriend": "Friend or colleague",

  // PostSignupOnboarding.tsx — final step, McpRecommendation. Reuses
  // onboarding.option.keywordResearch/competitorResearch above for two of its
  // three capability bullets: same words, same fact, listed once.
  "onboarding.mcp.title": "Set up EchoSEO MCP?",
  "onboarding.mcp.pitch":
    "The most powerful way to use EchoSEO — use AI to supercharge your SEO skills.",
  "onboarding.mcp.capability.linkProspecting": "Link prospecting",
  "onboarding.mcp.setup": "Yes, set up MCP",
  "onboarding.mcp.notNow": "Not now",

  // SearchConsoleOnboardingStep.tsx — the connect/pick-a-property flow.
  // Shared connect/property-picker/failure copy comes from gsc.* (SitePicker,
  // SelfHostedSetupWarning, gsc.connectWithGoogle, gsc.card.checking); these
  // ids cover only what's unique to the onboarding framing of that step.
  "onboarding.gscStep.title": "Connect with Google Search Console now?",
  "onboarding.gscStep.disclaimer":
    "For now, Search Console data flows through the EchoSEO MCP. We're building it into the EchoSEO app soon too.",
  "onboarding.gscStep.connected": "Connected to <mono>{siteUrl}</mono>.",
  "onboarding.gscStep.saveError": "Could not save that property.",
} as const;
