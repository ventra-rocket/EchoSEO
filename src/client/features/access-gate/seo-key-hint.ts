// The last DataForSEO key status this browser saw, and the rule for when the
// first paint may act on it.
//
// The setup banner sits in normal flow above the content, so an answer that
// arrives after the first paint moves every click target down by the banner's
// height — measured at 66px, on a product that reports CLS to its users.
// Reserving the height unconditionally would cost that space to the majority
// who have a key, so the first paint uses the previous answer instead.
//
// Browser-local and advisory: the server is still the only thing that decides
// whether a key exists, every gate keeps waiting for it, and a status changed
// on another device simply corrects itself on the next answer.
const SEO_KEY_CONFIGURED_HINT_KEY = "echoseo:dataforseo-key-configured";

export function getSeoKeyConfiguredHint(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SEO_KEY_CONFIGURED_HINT_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function setSeoKeyConfiguredHint(configured: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SEO_KEY_CONFIGURED_HINT_KEY,
      configured ? "1" : "0",
    );
  } catch {
    // Ignore private-mode / disabled-storage failures: the banner then behaves
    // as it did before, appearing once the server answers.
  }
}

/**
 * The key status to render from, before or after the server answers.
 *
 * The hint is only trusted once the setup modal has been dismissed this
 * session. While that modal can still open it — not the banner — carries the
 * setup CTA, and a banner painted first would collapse again the moment the
 * modal takes over, trading one shift for two.
 */
export function resolveSeoKeyConfigured({
  answer,
  hint,
  setupModalDismissed,
}: {
  answer: boolean | null;
  hint: boolean | null;
  setupModalDismissed: boolean;
}): boolean | null {
  if (answer !== null) return answer;
  if (!setupModalDismissed) return null;
  return hint;
}
