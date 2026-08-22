// Prompt Explorer: form, results, rendered markdown answers, and the AI-search setup/paid-plan gates.
export const aiPromptExplorer = {
  // Page (PromptExplorerPage.tsx). The <h1> reuses nav.promptExplorer so the
  // sidebar and the heading can't disagree.
  "aiPromptExplorer.page.subtitle":
    "Ask any prompt across ChatGPT, Claude, Gemini, and Perplexity side-by-side.",
  "aiPromptExplorer.page.recentSearches": "Recent searches",

  // useAiSearchAccess.ts — shared hook behind both BrandLookupPage and
  // PromptExplorerPage. Resolves through getLocalizedErrorMessage inside
  // useAccessGate; this is only the caller-owned fallback.
  "aiPromptExplorer.access.statusErrorFallback":
    "Could not load AI Optimization setup status.",

  // Form validation (PromptExplorerPage.tsx handleSubmit).
  "aiPromptExplorer.form.validation.emptyPrompt": "Enter a prompt",
  "aiPromptExplorer.form.validation.tooLong":
    "Keep prompts under {max, number} characters",
  "aiPromptExplorer.form.validation.noModels": "Select at least one model",

  // explorePrompt query error (PromptExplorerPage.tsx) — legacy resolver
  // replaced with getLocalizedErrorMessage + this fallback.
  "aiPromptExplorer.explore.errorDefault":
    "Could not run this prompt. Please try again.",

  // Paid-plan gate copy owned by this page. AiSearchPaidPlanGate.tsx renders
  // it through featureId/descriptionId/bullets props (BrandLookupPage supplies
  // its own from the aiBrandLookup catalog).
  "aiPromptExplorer.paidGate.description":
    "Ask one prompt across ChatGPT, Claude, Gemini, and Perplexity at the same time and compare their answers — including which sources each model cites.",
  "aiPromptExplorer.paidGate.bullets.models.title": "Four models side-by-side",
  "aiPromptExplorer.paidGate.bullets.models.body":
    "Run one prompt across ChatGPT, Claude, Gemini, and Perplexity and compare answers in a single view.",
  "aiPromptExplorer.paidGate.bullets.citations.title":
    "See what the models cite",
  "aiPromptExplorer.paidGate.bullets.citations.body":
    "Every answer lists the sources it drew from, so you can audit where each model gets its information.",
  "aiPromptExplorer.paidGate.bullets.brand.title": "Check brand mentions",
  "aiPromptExplorer.paidGate.bullets.brand.body":
    "Highlight a brand to instantly see whether it shows up in the answer text or the cited sources.",

  // PromptExplorerForm.tsx
  "aiPromptExplorer.form.promptLabel": "Prompt",
  "aiPromptExplorer.form.promptHint": "What your customers might ask AI.",
  "aiPromptExplorer.form.brandLabel": "Highlight brand (optional)",
  "aiPromptExplorer.form.brandHint":
    "We'll flag whether each model mentions this brand.",
  "aiPromptExplorer.form.modelsLabel": "Models",
  "aiPromptExplorer.form.webSearchLabel":
    "Allow web search (more current answers)",
  "aiPromptExplorer.form.webSearchLocationAria": "Web search location",
  "aiPromptExplorer.form.submit": "Run",
  "aiPromptExplorer.form.submitting": "Running…",

  // PromptExplorerResults.tsx
  "aiPromptExplorer.results.citedSourcesHeading":
    "Cited sources ({count, number})",
  "aiPromptExplorer.results.relatedQueriesHeading":
    "Related queries the model considered",
  "aiPromptExplorer.results.errorBadge": "Error",
  "aiPromptExplorer.results.webSearchBadge": "web search",
  "aiPromptExplorer.results.tokensCount": "{count, number} tokens",
  "aiPromptExplorer.results.brandNotMentioned": "no {brand}",

  // MarkdownAnswer.tsx — wrapper copy only; the rendered markdown itself is
  // model output and stays out of scope.
  "aiPromptExplorer.markdown.emptyResponse":
    "Model returned an empty response.",
  "aiPromptExplorer.markdown.modelThinking": "Model Thinking",
  "aiPromptExplorer.markdown.showLess": "Show less",
  "aiPromptExplorer.markdown.readMore": "Read more",

  // AiSearchSetupGate.tsx — DataForSEO "AI Optimization" product not enabled
  // yet. Shared by BrandLookupPage and PromptExplorerPage; the copy has no
  // per-caller variation, so neither caller passes props for it.
  "aiPromptExplorer.setupGate.title": "Enable AI Optimization",
  "aiPromptExplorer.setupGate.body":
    "AI Optimization is not enabled for your DataForSEO account yet. You can enable it in DataForSEO, or use managed EchoSEO for long-term LLM Mentions access at {price}/month.",
  "aiPromptExplorer.setupGate.helper":
    "We are also planning an API so self-hosted apps can use EchoSEO's LLM Mentions data directly. Until then, {link}.",
  "aiPromptExplorer.setupGate.helperLink": "use managed EchoSEO",
  "aiPromptExplorer.setupGate.confirmButton": "Confirm AI Optimization Access",
  "aiPromptExplorer.setupGate.confirming": "Confirming...",
  "aiPromptExplorer.setupGate.externalLabel": "Open DataForSEO API Access",

  // AiSearchPaidPlanGate.tsx — structure only. feature/description/bullet
  // copy is caller-supplied through *Id props.
  "aiPromptExplorer.paidGate.badge": "Paid plan",
  "aiPromptExplorer.paidGate.title": "Unlock {feature}",
  "aiPromptExplorer.paidGate.upgrade": "Upgrade",

  // SearchHistorySection.tsx — shared by PromptExplorerHistorySection and
  // BrandLookupHistorySection; emptyMessageId/nounId are caller-supplied.
  "aiPromptExplorer.history.recentCount":
    "{count, plural, one {# recent {noun}} other {# recent {noun}s}}",
  "aiPromptExplorer.history.removeAria": "Remove from history",

  // PromptExplorerHistorySection.tsx
  "aiPromptExplorer.history.emptyMessage":
    "Enter a prompt to compare model answers",
  "aiPromptExplorer.history.noun": "prompt",
} as const;
