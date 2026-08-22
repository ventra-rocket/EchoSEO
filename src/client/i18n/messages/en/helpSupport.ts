// The DataForSEO API-key help page and the support route. Every other
// converted surface links to one of these two: the shell setup banner, the
// setup modal, the DataForSEO key card, and every key-missing gate on
// Keyword Research, Backlinks, and Domain Overview point at
// /help/dataforseo-api-key; the account menu and the free-plan banner point
// at /support. A translated entry point landing on an English document is
// the exact bug this catalog exists to close.
//
// A few strings a reader has to match verbatim against something outside
// EchoSEO — DataForSEO's own "API Access" request page, the "Base64"
// encoding step, the literal `DATAFORSEO_API_KEY` secret name, and the exact
// API error text DataForSEO returns for an account that isn't serving data
// yet — stay in English in both locales. Translating them would send someone
// hunting for a phrase that does not exist on the screen, or in the response,
// they are actually looking at.
export const helpSupport = {
  // dataforseo-api-key.tsx — intro card.
  "helpSupport.apiKey.title": "Set up your DataForSEO API key",
  "helpSupport.apiKey.intro":
    "EchoSEO needs the {envVar} secret before keyword, domain, and SEO data workflows can run.",

  // dataforseo-api-key.tsx — "Steps" card: request credentials, base64
  // encode them, save the secret.
  "helpSupport.apiKey.steps.heading": "Steps",
  "helpSupport.apiKey.steps.requestAccess":
    "Go to <link>DataForSEO API Access</link> and request API credentials by email.",
  "helpSupport.apiKey.steps.encodeIntro":
    "Base64 encode your DataForSEO login and API password in this format:",
  "helpSupport.apiKey.steps.saveSecret":
    "Save the output as the {envVar} secret in your environment.",

  // dataforseo-api-key.tsx — "Add the key in Settings" card. Every mention of
  // "Settings" and of the DataForSEO section name is a value sourced from
  // account.settings / seoProvider.section rather than retyped, so this page
  // cannot end up pointing at a heading or section name Settings itself no
  // longer shows.
  "helpSupport.apiKey.settings.heading": "Add the key in {settingsLabel}",
  "helpSupport.apiKey.settings.openSettings":
    "Open <link>{settingsLabel}</link>.",
  "helpSupport.apiKey.settings.findSection":
    "Find the <strong>{sectionLabel}</strong> section.",
  "helpSupport.apiKey.settings.pasteValue":
    "Paste the base64 value from the terminal command above and save.",
  "helpSupport.apiKey.settings.selfHosted":
    "Self-hosting? Set the {envVar} secret instead — see {command} in your deployment docs.",

  // dataforseo-api-key.tsx — slow-activation notice for brand-new DataForSEO
  // accounts. The error code and the quoted API message are exactly what
  // DataForSEO's API returns, always in English; a reader checking logs or a
  // network tab needs the literal text, not a translation of it.
  "helpSupport.apiKey.slowActivation.heading":
    "A new account may not answer straight away",
  "helpSupport.apiKey.slowActivation.body":
    "A brand-new DataForSEO account can take about a day before its API starts answering, even once you have finished the email verification step. Until it does, every data request comes back as {errorCode} — {apiMessage} — while the DataForSEO dashboard shows nothing wrong.",
  "helpSupport.apiKey.slowActivation.reassurance":
    "This is not a problem with your key, and there is nothing to fix on the EchoSEO side. Saving the key in {settingsLabel} tells you which state you are in: a wrong key is rejected outright, while a good key on an account that is not serving yet is saved with a note saying so. Try again later.",

  // support.tsx — page header. The eyebrow reuses account.help as a value so
  // it can't drift from the identical words already shipped in the account
  // menu.
  "helpSupport.support.title": "We want to hear from you",
  "helpSupport.support.intro":
    "We want to talk to you! We're super open to feedback and want to learn how you work so we can make EchoSEO better.",

  "helpSupport.support.email.label": "Email",
  "helpSupport.support.email.description":
    "Send ideas, problems, questions, or feedback directly.",
  "helpSupport.support.email.copiedToast": "Email copied to clipboard",

  "helpSupport.support.discord.label": "Discord",
  "helpSupport.support.discord.description":
    "Ask for help, share ideas and learn from the community.",
  "helpSupport.support.discord.cta": "Join the Discord",

  "helpSupport.support.github.label": "GitHub Issues",
  "helpSupport.support.github.description":
    "Report bugs or request features on GitHub.",
  "helpSupport.support.github.cta": "Open an issue",
} as const;
