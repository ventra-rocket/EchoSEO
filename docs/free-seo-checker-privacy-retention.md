# Free SEO Checker — Privacy & Retention

**Version:** 1.0 · **Date:** 2026-07-15 · **Status:** Implemented (retention cron live)
**Scope:** the public, anonymous Free SEO Checker only (`/free-seo-check`, `/r/{id}`).
Authenticated workspace audits are out of scope and keep their own rules.

## What we collect, and why

| Data                                                 | Where                                                               | Why                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Email address                                        | D1 `leads.email` (+ `email_normalized`)                             | Deliver the Deep report; per-email abuse quota. Given voluntarily on the Deep form.                                        |
| The URL you asked us to check                        | D1 `leads.url`, `seo_reports.url`, and inside the R2 report payload | It is the subject of the report.                                                                                           |
| Report contents (scores, signals, crawled page list) | R2 `deep-reports/{id}.json`                                         | The report itself.                                                                                                         |
| Consent timestamp                                    | D1 `leads.consent_confirmed_at`                                     | Evidence of the double opt-in.                                                                                             |
| IP address                                           | Never stored                                                        | Used only in-memory for rate limiting (Durable Object counters keyed by IP, which self-expire); never written to D1 or R2. |

The Lite check stores **no personal data at all** — it is anonymous, needs no
email, and its per-domain cache is keyed by hostname.

**A checked URL can itself be personal data.** A staging, unlisted, or internal
URL reveals something about the person who submitted it. We therefore treat the
URL with the same care as the email.

## Lawful basis

Consent, via **double opt-in**. Submitting the Deep form does not start anything:
we email a confirmation link, and only a click on that link (an explicit POST,
never a link prefetch) records consent and starts the check. This is also what
stops the form being used to send unwanted mail to someone else's address.

## Retention

| What                                       | Kept for                                                   | Clock starts at                                          |
| ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| Confirmed lead + its reports + R2 payloads | **30 days**                                                | When the report **finished** (`seo_reports.finished_at`) |
| Lead that never confirmed                  | **7 days** after the confirm link expires (links last 24h) | `leads.confirm_token_expires_at`                         |

Both are deleted by a daily sweep at 03:00 UTC (`services/seo-check/retention.ts`).

Two details that matter:

- **Expiry is measured from when a report finished, not when it was requested.**
  Otherwise a report that took a week to run would get a week less life than one
  that ran instantly.
- **A report still running is never deleted**, no matter how old the request is.
  Only reports in a terminal state (`done`, `failed`, `expired`) age out.

Leads that never confirmed are swept on their own clock precisely _because_ their
report never reaches a terminal state. Without that second sweep, the people who
never consented would be the only ones whose address we kept forever.

A check that finds we already audited that site today reuses those results
instead of re-crawling. Such a report never runs and so never gets a finish time
of its own; it expires 30 days from when it was linked to the audit it reused,
which is the same day. Its link can therefore lapse up to a day before or after
the audit it points at.

Deleting a lead cascades to its reports (D1 foreign key) and the sweep purges the
matching R2 payloads in the same pass. Once the sweep runs, the `/r/{id}` link
stops working — the email says when that will happen before it does.

Operators can retune both windows without a code deploy:
`FREE_CHECK_RETENTION_DAYS` and `FREE_CHECK_UNCONFIRMED_GRACE_DAYS`.

## Report links are unguessable, not authenticated

`/r/{id}` is a **bearer link**: anyone holding it can read that report. This is
deliberate for the free tier — no account exists to log into. Protections:

- The id is a 122-bit `crypto.randomUUID()`. It is not sequential and not derived
  from the URL or the email.
- `Referrer-Policy: no-referrer` (plus a meta tag and `rel="noreferrer"` on
  outbound links), so clicking a Google citation link on the report cannot leak
  the link to Google.
- `X-Robots-Tag: noindex` and `robots.txt` disallows `/r/`, so a pasted link
  stays out of search results.
- Reads are rate limited per IP.
- **The page never renders the email or any other lead data** — only the report.

Do not use this mechanism for authenticated workspace audits; those get private,
invite-based review access instead.

## Your rights

Email **ventrarocket.work@gmail.com** to:

- **See** what we hold for your address;
- **Delete** it immediately, ahead of the retention window;
- **Withdraw consent**.

Erasure covers D1 (lead + reports) and R2 (report payloads) — the two places
anything personal is written. We action deletion requests manually today; the
volume does not yet justify automation.

## Sub-processors

| Who                       | What they see                           | Why                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare                | Everything (D1, R2, Workers, Turnstile) | Hosting.                                                                                                                                                                                                                                                                                                                                    |
| Google PageSpeed Insights | The checked URL only — never the email  | Lighthouse + Core Web Vitals data.                                                                                                                                                                                                                                                                                                          |
| PostHog                   | Nothing, on this deployment             | Both server- and client-side capture are gated to hosted auth mode; this deployment runs `cloudflare_access`, so no checker traffic reaches PostHog at all. If hosted mode were ever switched on, this row must be re-checked before relying on it — error captures include the request path, and a report link is path-shaped (`/r/{id}`). |
| Resend                    | Email address + report link             | Delivering the report. _(Pending — email is not yet enabled.)_                                                                                                                                                                                                                                                                              |

## Known gaps

- Erasure is a manual, human-handled process rather than a self-serve flow.
- The sweep handles up to 500 expired and 500 abandoned leads per run, so a large
  backlog drains over several days instead of in one pass.
- If R2 is unavailable during a sweep we still delete the D1 rows (removing the
  email) and log the orphaned payload keys for manual cleanup — the alternative,
  keeping the PII until R2 recovers, is worse.
- **A check that never reaches a final state has no deletion deadline.** If a
  check is interrupted such that it is left permanently mid-flight — the workflow
  dies after exhausting its retries, say — the sweep will not touch that record,
  because it cannot distinguish it from work still in progress. The address stays
  until someone asks us to remove it (see _Your rights_) or a future sweep for
  stalled checks lands. We are not aware of any such record today; the write-ups
  of the failure paths that could create one are in the plan files.
