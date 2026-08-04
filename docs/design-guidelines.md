# EchoSEO Signal Console — design guidelines

The authenticated dashboard is an evidence-first data workbench. It borrows the
_structural grammar_ of dense SEO tools (persistent tool navigation, contextual
utility bar, flat high-density evidence surfaces, value → drill-down) and
expresses it entirely in EchoSEO's own identity. It never copies another
product's logo, font, palette, copy, icon set, or proprietary metric names.

Scope of this document: the authenticated shell and the Project Command Center
(Phase A). The public Free SEO Checker keeps its own `.fsc-*` design system and
is out of scope here.

## Identity and tokens

- **Type:** IBM Plex Sans (body) and IBM Plex Mono (readouts), self-hosted, from
  `src/client/styles/app.css`. No new font or network asset.
- **Themes:** the two existing daisyUI themes `openseo` (light) and
  `openseo-dark` (dark). No third theme; dark is the primary surface. The active
  theme is written to `data-theme` by the pre-hydration script in
  `src/client/lib/theme.ts` from the `theme-preference` store.
- **Colour:** semantic daisyUI tokens only — teal `primary` for
  selection/action, amber `accent`/`warning` for attention, plus
  `success`/`error`/`info`. Status is never colour-only: it always pairs an icon
  or text label with the hue.
- **Surfaces:** near-flat `base-100` work surfaces on the `base-200` ground,
  hairline `base-300` dividers, small controlled radius, minimal shadow.

### Signal Console utilities (`app.css`)

A small scoped vocabulary, all prefixed `.signal-*`, composes the tokens above.
It never touches `.fsc-*` or the global themes.

| Utility                                | Purpose                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `.signal-panel`                        | Flat raised work surface (border + `base-100`).                                   |
| `.signal-panel-inset`                  | Quiet surface on the ground (provenance, rails).                                  |
| `.signal-divider`                      | Hairline separator from `base-content`.                                           |
| `.signal-label`                        | Small, quiet, uppercase section/evidence label (not a heading).                   |
| `.signal-meta`                         | Muted metadata (source, freshness, provenance).                                   |
| `.signal-value`                        | Tabular primary readout.                                                          |
| `.signal-row`                          | Compact interactive row with a 44px touch target.                                 |
| `.signal-focus`                        | Shared visible focus ring for custom controls.                                    |
| `.signal-interactive` / `.signal-spin` | Colour transition / refresh spin, both suppressed under `prefers-reduced-motion`. |

### Density dials

Density **8/10**, visual variance **4/10**, motion **3/10**. Prefer information
per row over whitespace; keep variance and motion low.

## Responsive shell

One accessible representation of each navigation item exists per breakpoint. The
sidebar owns tool navigation; the topbar owns context and utilities (brand,
project switcher, language, help, account).

| Viewport   | Structure                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------- |
| ≥1280px    | 56px topbar + persistent 240px full sidebar                                                  |
| 768–1279px | 56px topbar + persistent 64–72px icon rail; its expand control opens the full drawer overlay |
| <768px     | 56px topbar + hamburger → 288px modal drawer                                                 |

No horizontal page overflow at 375 / 768 / 1440px in either theme. Rail/sidebar
and content use `min-w-0`; wide content scrolls inside its own container.

## Keyboard and accessibility contract

- A skip link is the first focusable element and targets the shell scroll
  container `#app-main-content`. It is the first Tab stop **only when no modal
  owns focus**.
- The nav drawer and the DataForSEO setup modal are `role="dialog"`
  `aria-modal="true"`: each moves focus in on open, contains Tab/Shift+Tab,
  closes on Escape and (drawer) backdrop/nav click, and restores focus to the
  opening trigger on every close path. While the drawer is open the rest of the
  shell is `inert`.
- The setup modal owns focus while open; the skip link resumes first-Tab
  behaviour after it closes.
- Icon-only controls carry a localized accessible name; the rail does not expose
  a duplicate accessible link. Touch targets are ≥44px, focus is always visible,
  and every new animation is suppressed under reduced motion.

## Privacy (PostHog session replay)

- The account email keeps `data-ph-mask`.
- Tenant-derived text is masked: project name and domain (topbar switcher,
  drawer switcher, Command Center header) and Command Center evidence values and
  freshness details.
- Static labels (nav labels, section headings, source words) stay observable.

## Localization

All new visible strings are added to both `en.ts` and `vi.ts` in the same change.
English is the typed source of truth (`Messages`), so catalog parity is
compiler-enforced. Shell and project-switcher strings live under `shell.*` /
`projectSwitcher.*`; Command Center strings under `commandCenter.*`.

## Command Center evidence hierarchy

The project home renders six layers top to bottom, driven by the pure view-model
`command-center-view-model.ts`:

1. Project context and source freshness.
2. Evidence-first next action.
3. Four-cell signal strip.
4. Data-health rows.
5. Priority workspace.
6. Provenance disclosure.

## Data-honesty invariants

These are contract, not styling. They are enforced by the pure view-model and
covered by `command-center-view-model.test.ts`.

- **No fake trend.** No delta, sparkline, direction, baseline, or percentage is
  rendered, because `getProjectCommandCenter` exposes current state, not a
  persisted comparison series. There is no trend utility to reach for. Add one
  only when the server returns comparable snapshots.
- **Never invent zero/success.** An unknown or unavailable source is shown as
  such, never as a `0`, a clean result, or a success. Empty recommendations mean
  "done" only when every relevant source is known; otherwise the next-action
  card says recommendations are incomplete and offers a retry.
- **Freshness is attributed to the right run.** Current audit state belongs to
  the _latest_ audit; issue counts and materialization belong to the _last
  completed_ audit (labelled as such when a newer run is in progress). Rank
  freshness across trackers is a range or an explicit mixed/never-run state — the
  aggregate is never stamped with only the newest run.
- **A failed or queued audit says so.** The latest audit's state is reported
  distinctly (`running` / `queued` / `failed` / `completed`); a failed or stuck
  run is never rendered as "in progress", which would imply work that is not
  happening.
- **Every shown metric identifies its source and, where known, its exact
  freshness.** The page starts no new external request on load.

## Change and rollback boundary

Phase A is presentation only. It does not change routes, server functions,
database schema, environment keys, provider calls, auth rules, or action IDs.
The rollback boundary is the frontend release commit: reverting it restores the
previous shell and Command Center with no data migration or cache cleanup,
because no contract or stored state was touched. If navigation regresses, the
shell components can be reverted independently of the Command Center
presentation.
