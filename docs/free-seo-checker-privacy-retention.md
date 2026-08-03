# Free SEO Checker — Privacy & Retention

**Version:** 1.2 · **Date:** 2026-08-03 · **Status:** Implemented (retention cron live)
**Scope:** the public, anonymous Free SEO Checker only (`/free-seo-check`,
`/vi/kiem-tra-seo`, `/r/{id}`, `/c/{id}`). Authenticated workspace audits are out
of scope and keep their own rules; the hosted service's own terms are at
`/privacy`.

**What 1.2 adds:** every Lite check now mints a shareable `/c/{id}` link backed
by a frozen copy of that result (a "share snapshot") in R2. New artifact, new
retention row, and a second bearer-link surface — documented below.

**What 1.1 corrects,** all verified against the running deployment's configured
secrets rather than against intent:

- **PostHog.** The service moved from `cloudflare_access` to `hosted` auth after
  1.0 was written — precisely the condition the PostHog row said to re-check.
  The auth-mode gate is now open; only a missing key stops the capture.
- **Resend.** Was marked pending; it is live.
- **The page screenshot was not disclosed at all.** 1.0 documented the report
  payload but not the image stored beside it. Added to both tables.

## What we collect, and why

| Data                                                 | Where                                                               | Why                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email address                                        | D1 `leads.email` (+ `email_normalized`)                             | Deliver the Deep report; per-email abuse quota. Given voluntarily on the Deep form.                                                                      |
| The URL you asked us to check                        | D1 `leads.url`, `seo_reports.url`, and inside the R2 report payload | It is the subject of the report.                                                                                                                         |
| Report contents (scores, signals, crawled page list) | R2 `deep-reports/{id}.json`                                         | The report itself.                                                                                                                                       |
| Consent timestamp                                    | D1 `leads.consent_confirmed_at`                                     | Evidence of the double opt-in.                                                                                                                           |
| A screenshot of the checked page                     | R2 `site-screenshots/{domain}`                                      | Shown on the result and the report as evidence of what we loaded. Keyed by hostname, not by report id or email.                                          |
| A frozen copy of a Lite result (share snapshot)      | R2 `lite-checks/{id}.json`                                          | Renders the shareable `/c/{id}` link. Holds the report (public page data), the check's language, and when it ran — no email, keyed by an unguessable id. |
| IP address                                           | Never stored                                                        | Used only in-memory for rate limiting (Durable Object counters keyed by IP, which self-expire); never written to D1 or R2.                               |

The Lite check stores **no personal data at all** — it is anonymous, needs no
email, and its per-domain cache is keyed by hostname. The same is true of the
screenshot: it is an image of a public page, filed under that page's hostname,
with nothing tying it to whoever asked for it. It is listed here anyway, because
it is a stored artifact derived from a URL someone gave us, and this document is
worth nothing if it omits things on the grounds that they are probably fine.

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
| Screenshot of a checked page               | **7 days**                                                 | When the capture was stored                              |
| Share snapshot of a Lite check (`/c/{id}`) | **30 days**                                                | When the check ran (snapshots are write-once)            |

All four are deleted by a daily sweep at 03:00 UTC
(`services/seo-check/retention.ts`). The screenshot expires on its own clock
because it belongs to a hostname rather than to a lead: deleting someone's lead
cannot delete it, since another visitor may have checked the same site. The
share snapshot likewise has no lead to cascade from — it is anonymous by
construction — so it too ages out on its own clock, measured from the check
itself. Once swept, the `/c/{id}` link answers 404.

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

`/r/{id}` and `/c/{id}` are **bearer links**: anyone holding one can read that
report. This is deliberate for the free tier — no account exists to log into.
Protections:

- The id is a 122-bit `crypto.randomUUID()`. It is not sequential and not derived
  from the URL or the email.
- `Referrer-Policy: no-referrer` (plus a meta tag and `rel="noreferrer"` on
  outbound links), so clicking a Google citation link on the report cannot leak
  the link to Google.
- `X-Robots-Tag: noindex` and `robots.txt` disallows `/r/`, so a pasted link
  stays out of search results. `/c/` carries the same noindex header + meta but
  is deliberately **not** in robots.txt: the share page exists to be unfurled,
  and a Disallow would stop Facebook/Zalo/Twitter bots from ever reading its OG
  tags. Noindex alone is what keeps it out of search results; neither page is
  in the sitemap.
- Reads are rate limited per IP.
- **The page never renders the email or any other lead data** — only the report.
  `/c/{id}` cannot: its snapshot never contained an email in the first place.

Do not use this mechanism for authenticated workspace audits; those get private,
invite-based review access instead.

## Your rights

Email **ventrarocket.work@gmail.com** to:

- **See** what we hold for your address;
- **Delete** it immediately, ahead of the retention window;
- **Withdraw consent**.

Erasure covers D1 (lead + reports) and R2 (report payloads) — every place
something is written that is tied to you.

It does **not** remove the page screenshot, and cannot: that object is filed
under the checked site's hostname with nothing recording who requested it, so
another visitor may have caused the same capture. It is an image of a public page
and it self-deletes after 7 days. Ask and we will delete it early.

We action deletion requests manually today; the volume does not yet justify
automation.

## Sub-processors

| Who                       | What they see                           | Why                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudflare                | Everything (D1, R2, Workers, Turnstile) | Hosting.                                                                                                                                                                                                                                                                                                                       |
| Google PageSpeed Insights | The checked URL only — never the email  | Lighthouse + Core Web Vitals data.                                                                                                                                                                                                                                                                                             |
| PostHog                   | Nothing, on this deployment             | Capture on both the client and the server needs two things: hosted auth mode, and a configured key. **This deployment now runs `hosted`, so the auth-mode gate is open** — the only reason nothing reaches PostHog is that no `POSTHOG_PUBLIC_KEY`/`POSTHOG_HOST` is set on the Worker. See the note below before setting one. |
| Resend                    | Email address + report link             | Delivering the report, and account mail for the signed-in product. Live.                                                                                                                                                                                                                                                       |

**Before adding a PostHog key.** Error captures include the request path, and a
report link is path-shaped (`/r/{id}`) — that id is a bearer capability, so
sending those paths would hand a third party the ability to read any report they
appear in. The paths have to be stripped or redacted first. This used to be a
hypothetical guarded by the auth mode; it is now the only thing standing between
a configured key and that leak.

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
