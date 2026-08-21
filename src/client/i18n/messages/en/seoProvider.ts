// SEO data provider settings — the DataForSEO key card.
export const seoProvider = {
  "seoProvider.section": "SEO data provider",
  "seoProvider.description":
    "Use your own DataForSEO account for keyword, rank, backlink, and domain data. You're billed by DataForSEO directly; EchoSEO only covers the AI features.",
  // Appended to the description only when the server reports a platform default
  // this deployment would actually spend.
  "seoProvider.platformDefault":
    "Leave this empty to use the platform default instead.",
  "seoProvider.getKey": "Get a key at dataforseo.com",
  "seoProvider.inputLabel": "API key (base64 of your login:password)",
  "seoProvider.placeholder": "Paste your DataForSEO API key",
  "seoProvider.checking": "Checking…",
  "seoProvider.loadError": "We couldn't load the DataForSEO key status.",
  "seoProvider.save": "Save key",
  "seoProvider.saving": "Saving…",
  "seoProvider.remove": "Remove",
  "seoProvider.removing": "Removing…",
  "seoProvider.badge.org": "Your key",
  "seoProvider.badge.global": "Platform default",
  "seoProvider.badge.none": "Not set",
  "seoProvider.toast.saved":
    "DataForSEO key saved. Your account answered a data request, so you're ready to go.",
  "seoProvider.toast.savedNotServing":
    "Key saved, but DataForSEO won't serve data for this account yet.",
  "seoProvider.toast.savedReadinessUnknown":
    "Key saved. We couldn't check whether your DataForSEO account can fetch data.",
  "seoProvider.notice.notServing":
    "DataForSEO accepts this key but refused a data request for the account behind it. That happens when a brand-new account has not started answering yet, when the balance is empty, or when the account is suspended or limited to specific IP addresses. Only the first of those clears on its own — check your DataForSEO dashboard to see which one you are in.",
  "seoProvider.notice.readinessUnknown":
    "We couldn't reach DataForSEO to check whether this account can fetch data, so the key is saved unverified. Open a page that uses provider data to find out.",
  "seoProvider.notice.helpLink": "More on DataForSEO account readiness",
  "seoProvider.toast.removed": "DataForSEO key removed.",
  "seoProvider.toast.invalidKey":
    "That DataForSEO key was rejected. Check the base64 of your login:password and try again.",
  "seoProvider.toast.authFailed":
    "DataForSEO refused this key. Either it is wrong, or the account behind it is suspended or limited to specific IP addresses.",
  "seoProvider.toast.forbidden":
    "Only workspace owners and admins can change the DataForSEO key.",
  "seoProvider.toast.error": "We couldn't save the DataForSEO key.",
} as const;
