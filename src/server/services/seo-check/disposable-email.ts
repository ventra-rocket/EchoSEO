/**
 * Lightweight disposable-email screen for the Free Deep SEO Checker opt-in.
 *
 * A small static blocklist of the most common throwaway providers — enough to
 * blunt casual abuse without a network lookup. It is deliberately not
 * exhaustive; the double opt-in step is the real spam control.
 */

const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mohmal.com",
  "mailnesia.com",
  "emailondeck.com",
  "spam4.me",
  "tempmailo.com",
  "moakt.com",
]);

/** Trimmed + lowercased form used for storage, quotas, and dedupe. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  return domain.length > 0 ? domain : null;
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  return domain !== null && DISPOSABLE_DOMAINS.has(domain);
}
