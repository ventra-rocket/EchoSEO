# i18n — bilingual UI (English + Vietnamese)

EchoSEO ships bilingual **EN + VN** from day one (net-new vs upstream OpenSEO,
which is English-only). This module is the i18n scaffolding: the provider, the
locale config, the message catalogs, and the language switcher.

## Library choice: react-intl (FormatJS)

Chosen over Paraglide/inlang, Lingui, and i18next for this stack (TanStack Start
with React 19 on Cloudflare Workers):

- **Request-safe by construction.** `IntlProvider` takes `locale` + `messages`
  as plain props — no mutable module singleton — so nothing can leak locale
  between concurrent Worker requests. (The app also renders inside `<ClientOnly>`,
  so locale is resolved client-side and there is no SSR hydration mismatch to
  manage either.)
- **Number/date formatting built in** via `useIntl().formatNumber/formatDate`
  and `<FormattedNumber>` / `<FormattedDate>`, backed by the Workers-native
  `Intl` — satisfies the locale-aware formatting requirement with no extra deps.
- **No compiler/build step.** Catalogs are plain typed objects, bundled at build
  time. That keeps the Vite/Wrangler build config untouched — important for a
  fork that must stay mergeable with upstream.
- **Node-testable.** `createIntl({ locale, messages })` runs in the `node` test
  environment, so message resolution + formatting are unit-tested without a DOM.

Paraglide would give a smaller runtime + compile-time message tree-shaking; it
was deferred because its compiler-in-build integration adds upstream-merge
surface and could not be browser-verified during this pass. Migrating later is
mostly a call-site swap (`intl.formatMessage` → generated `m.*`).

## Usage

```tsx
import { useIntl, FormattedMessage } from "react-intl";

const intl = useIntl();
intl.formatMessage({ id: "nav.rankTracking" });
// or in JSX:
<FormattedMessage id="nav.rankTracking" />;
```

Change / read locale:

```tsx
import { useLocale } from "@/client/i18n/I18nProvider";
const { locale, setLocale } = useLocale();
```

`<I18nProvider>` is mounted once in `src/routes/__root.tsx`. `<LanguageSwitcher>`
lives in the app shell topbar.

## Catalogs

- `messages/en.ts` — source of truth. Message IDs are namespaced by surface
  (`nav.*`, `account.*`, `language.*`). `MessageId` is derived from its keys.
- `messages/vi.ts` — typed as `Messages` (= `Record<MessageId, string>`), so the
  **compiler fails if any key is missing or misspelled** → catalog parity is
  guaranteed at build time (a runtime parity test double-checks it).

### Vietnamese review status

The VN catalog is a **machine-translated seed pending human review**. Quality
target for Phase 0 is "understandable"; a fluent pass is a follow-up. When a VN
string is human-approved, no code marker is needed — track sign-off in the
translation task, not here.

## Adding strings / extending coverage

1. Add the key + English copy to `messages/en.ts`.
2. Add the VN translation to `messages/vi.ts` (tsc enforces you do).
3. Replace the hardcoded string at the call site with `intl.formatMessage({ id })`
   or `<FormattedMessage id=... />`.

**Scope note (Phase 0):** only the app **shell** is externalized so far — the
project navigation, nav group headers, the account menu, and the switcher.
Remaining feature surfaces are extracted incrementally (ideally as their files
are touched for other work) to keep the upstream-merge diff small. Fallback for
any not-yet-translated string is the English source via `defaultMessage`.

## Adding a locale

Add the code to `SUPPORTED_LOCALES` in `config.ts`, create `messages/<code>.ts`
typed as `Messages`, and register it in `messages/index.ts`. The switcher and
parity test pick it up automatically.
