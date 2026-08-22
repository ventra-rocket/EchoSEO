# The gate that could not see

**Date:** 2026-08-23
**Component:** i18n across every remaining surface · onboarding chat locale and abuse limits · audit rule catalogue · report email
**Status:** #100–#107 and #111 closed. #108 waits on a human opening an inbox, #109 is a watch item, #121 is new and needs a production secret.

Six waves finished the bilingual milestone. The interesting part is not the
2,026 message ids; it is that **four separate waves found the same defect
class, and the gate built to prevent it was blind to all four.**

## What the gate can and cannot see

`no-hardcoded-strings.test.ts` walks a list of directories and reports English
prose in JSX text, whitelisted attributes, prop defaults and toast sinks. It is
genuinely good, and it kept catching things. But every real defect this week
lived where it cannot look:

- **`useAccessGate.ts`** resolved provider-gate failures through the English-only
  `STANDARD_MESSAGES` map. Four surfaces already listed as bilingual rendered an
  English sentence under a translated heading. The file holds no prose at all —
  nothing for a prose scanner to find — and the directory was listed by one
  file, not as a directory.
- **`features/ai-mcp`** renders half the `/ai` page: the copy control, setup
  guides, tool list, skills section. The route was converted; the directory it
  renders from was never listed. `Copy`, `Copied to clipboard` and two clipboard
  failure toasts stayed English on a Vietnamese page.
- **`useAiSearchAccess.ts`** passed a hardcoded English `statusErrorFallback` as
  an object-literal property. A subagent found this one, said plainly that the
  scanner could not see it, and asked before widening its scope. That was the
  right instinct and it is worth naming.
- **`CROSS_PAGE_RULES`** lived in `lib/audit/rules/` rather than beside the other
  four catalogues, so the localization test — which enumerates catalogues by
  hand — never included it. It reported a clean sweep of the catalogues it
  happened to know about while four audit findings rendered in English.

Every one of those was found the same way: **reading the actual screen in
Vietnamese after the agents reported done.** Not once by the gate.

The lesson is not "write a better gate". It is that a gate over a
hand-maintained list of places measures the list, not the property. Where the
list is the risk, the fix is to widen it _and_ to keep looking with your eyes.

## Numbers that were wrong until measured

Three issues carried estimates that measurement corrected, and in every case
the correction changed what to do:

| Claim                                         | Measured                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| #105 billing: 56 findings                     | **24** — `features/billing` had zero                       |
| #107 rule catalogue: "large, versioned prose" | **20 strings**, and 20 of 24 rules were already translated |
| #100 pre-login: 96 findings                   | **103**                                                    |

#107 is the sharpest example. It was filed as a decision — translate, keep
English, or translate the top-N — with a real argument for keeping English. The
argument rested on volume. Volume was four rules. There was no decision to
make, only work to do.

## The chat was a free API

Verifying the onboarding locale fix required a real model call, which meant
looking at how the chat spends money. Every limit lived inside the billing gate:

```ts
if (isHostedServerAuthMode() && !isHostedAccessOpen()) {
  /* cap */
}
```

Production runs `HOSTED_ACCESS_OPEN=true`. That block never executed. No turn
cap, no length limit, no rate limit — and the browser's seven-question gate is
client-side, while the Durable Object is reachable by any authenticated
WebSocket client. DataForSEO spend was already safe (the credential policy
resolves to `unavailable` in open access), so the exposure was LLM tokens, but
the shape was "a signed-up user can spend operator money for as long as they
care to type".

Worth noting what the fix is _not_: the guardrails are a pure function with
nine tests and no network, sitting in front of the model. The prompt hardening
against injection sits beside it, but a prompt is not a control. The fence
around fetched page content and the read-only tool surface are.

## Two smaller things I want to remember

**A preview that invents its own data can prove the opposite of the truth.** My
first weekly-email preview hardcoded English rule text into its fixture and
made the email look untranslated. Rebuilt to resolve copy through the same
`getIssueFixText` the real pipeline uses, it showed Vietnamese — which is what
the reader actually gets.

**`"max-width:600px"` contains `"width:600px"`.** A test asserting the absence
of a fixed width could never pass. The failure was mine, in the test, and it
cost a cycle to see.

## What is left, honestly

- #108 needs someone to open Monday's email in Gmail, Outlook and Apple Mail.
  Everything answerable from the HTML is answered: two real layout defects
  fixed, the rest audited clean.
- #121 is latent — production has no `OPENROUTER_API_KEY`, which does not matter
  while open access keeps the chat unreachable, and matters the day billing
  launches.
- #109 stays a watch item. Still unreproduced.
