/**
 * EchoSEO marketing landing — a locale-driven orchestrator.
 *
 * Renders English (`/`) and Vietnamese (`/vi`) from `landing-content.ts`. The
 * light, Ahrefs-grammar visual system (teal/cream/white/dark bands) lives in
 * `landing-page.css`. Product proof is an AUTHORED, sample-labelled app surface
 * (`landing-product-surface.tsx`) plus an MCP console — both use real product
 * data shapes; no fabricated customer results, testimonials, or logos.
 */

import type { ReactNode } from "react";
import { NewsletterSignup } from "@/components/newsletter-signup";
import {
  landingContent,
  type LandingContent,
  type LandingLocale,
} from "./landing-content";
import { ProductSurface } from "./landing-product-surface";
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconDomain,
  IconExternal,
  IconLayers,
  IconLock,
  IconRefresh,
  IconSearch,
  IconSparkles,
} from "./landing-icons";
import "./landing-page.css";

const GROUP_ICONS = [IconSearch, IconDomain, IconSparkles];
const EVIDENCE_ICONS = [IconRefresh, IconBook, IconLayers, IconLock];

function PrimaryCta({
  href,
  children,
  size,
}: {
  href: string;
  children: ReactNode;
  size?: "lg";
}) {
  return (
    <a
      href={href}
      className={`esl-btn esl-btn--primary${size === "lg" ? " esl-btn--lg" : ""}`}
    >
      {children}
      <IconArrowRight size={size === "lg" ? 18 : 16} className="esl-arrow" />
    </a>
  );
}

function GhostCta({
  href,
  children,
  size,
}: {
  href: string;
  children: ReactNode;
  size?: "lg";
}) {
  return (
    <a
      href={href}
      className={`esl-btn esl-btn--ghost${size === "lg" ? " esl-btn--lg" : ""}`}
    >
      {children}
    </a>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({ c }: { c: LandingContent }) {
  const h = c.hero;
  return (
    <section className="esl-section esl-section--teal esl-hero">
      <div className="esl-container">
        <div className="esl-hero-grid">
          <div className="esl-hero-copy esl-rise">
            <p className="esl-eyebrow">{h.eyebrow}</p>
            <h1 className="esl-display">
              {h.titleParts.map((part, i) => {
                const cls = [
                  part.accent ? "esl-hero-title-accent" : "",
                  part.nowrap ? "esl-nowrap" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return cls ? (
                  <span key={i} className={cls}>
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                );
              })}
            </h1>
            <p className="esl-lede">{h.subtitle}</p>
            <div className="esl-hero-cta">
              <PrimaryCta href={h.ctaPrimary.href} size="lg">
                {h.ctaPrimary.label}
              </PrimaryCta>
              <GhostCta href={h.ctaSecondary.href} size="lg">
                {h.ctaSecondary.label}
              </GhostCta>
            </div>
            <p className="esl-hero-micro esl-mono">
              {h.microTrust.split(" · ").map((item, i, arr) => (
                <span key={item}>
                  <span className="esl-nowrap">{item}</span>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>
          <div className="esl-hero-panel esl-rise esl-rise--delay">
            <ProductSurface surface={h.surface} />
            {h.floatingChips.map((chip, i) => (
              <span
                key={chip}
                className={`esl-float-chip esl-float-chip--${i}`}
              >
                <span className="esl-float-chip-dot" aria-hidden="true" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Honesty / capability strip ──────────────────────────────────────

function Chips({ c }: { c: LandingContent }) {
  return (
    <section className="esl-section esl-section--cream esl-section--compact esl-chips-band">
      <div className="esl-container">
        <div className="esl-chips">
          {c.chips.map((chip) => (
            <span key={chip} className="esl-chip esl-mono">
              <span className="esl-chip-dot" aria-hidden="true" />
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Workflows ───────────────────────────────────────────────────────

function Workflows({ c }: { c: LandingContent }) {
  const w = c.workflows;
  return (
    <section
      id="workflows"
      className="esl-section esl-section--light esl-workflows"
    >
      <div className="esl-container">
        <div className="esl-block">
          <p className="esl-eyebrow">{w.eyebrow}</p>
          <h2 className="esl-h2">{w.title}</h2>
          <p className="esl-lede">{w.subtitle}</p>
        </div>

        <div className="esl-wf-groups">
          {w.groups.map((group, gi) => {
            const GroupIcon = GROUP_ICONS[gi] ?? IconSearch;
            return (
              <div className="esl-wf-group" key={group.label}>
                <div className="esl-wf-label">
                  <h3 className="esl-h3">
                    <GroupIcon size={20} className="esl-wf-label-icon" />
                    {group.label}
                  </h3>
                  <p className="esl-wf-label-desc esl-small">{group.desc}</p>
                </div>
                <div className="esl-wf-cards">
                  {group.items.map((item) => (
                    <a
                      key={item.slug}
                      href={`/features/${item.slug}`}
                      className="esl-wf-card"
                    >
                      <h4 className="esl-wf-card-name">{item.name}</h4>
                      <p className="esl-wf-card-blurb">{item.blurb}</p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="esl-wf-all">
          <a href={c.footer.columns[0].links[0].href} className="esl-textlink">
            {w.allLabel} <IconArrowRight size={15} className="esl-arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Agent / MCP (the amber signal moment) ───────────────────────────

function Agent({ c }: { c: LandingContent }) {
  const a = c.agent;
  return (
    <section className="esl-section esl-section--dark esl-agent">
      <div className="esl-container">
        <div className="esl-agent-grid">
          <div className="esl-block">
            <p className="esl-eyebrow esl-eyebrow--amber">{a.eyebrow}</p>
            <h2 className="esl-h2">{a.title}</h2>
            <p className="esl-lede">{a.subtitle}</p>
            <p className="esl-clients-line esl-mono">
              <span className="esl-clients-label">{a.clientsLabel}</span>{" "}
              {a.clientList}
            </p>
            <div style={{ marginTop: 28 }}>
              <a href={a.cta.href} className="esl-textlink">
                {a.cta.label} <IconArrowRight size={15} className="esl-arrow" />
              </a>
            </div>
          </div>

          <div>
            <ConnectTerminal
              label={a.terminalCaption}
              aria={a.terminalAria}
              exampleTag={a.exampleTag}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** How you connect an agent — real transport + endpoint, no invented counts. */
function ConnectTerminal({
  label,
  aria,
  exampleTag,
}: {
  label: string;
  aria: string;
  exampleTag: string;
}) {
  return (
    <div className="esl-panel">
      <div className="esl-panel-bar">
        <span className="esl-panel-dots" aria-hidden="true">
          <span className="esl-panel-dot" />
          <span className="esl-panel-dot" />
          <span className="esl-panel-dot" />
        </span>
        <span className="esl-panel-label esl-mono">{label}</span>
        <span className="esl-panel-tag esl-mono">{exampleTag}</span>
      </div>
      <div className="esl-panel-well">
        <pre
          className="esl-terminal"
          tabIndex={0}
          role="region"
          aria-label={aria}
        >
          <code>
            <span className="t-dim"># add EchoSEO to your MCP client</span>
            {"\n"}
            <span className="t-teal">$</span> claude mcp add echoseo \{"\n"}
            {"    --transport http \\"}
            {"\n"}
            {"    "}
            <span className="t-amber">
              https://app.echoseo.ventrarocket.vn/mcp
            </span>
            {"\n\n"}
            <span className="t-ok">✓</span>
            <span className="t-dim"> connected · keyword, SERP, domain,</span>
            {"\n"}
            <span className="t-dim">
              {" "}
              backlink & Search Console tools ready
            </span>
            {"\n\n"}
            <span className="t-teal">›</span>{" "}
            <span className="t-ink">
              your agent now researches with your data
            </span>{" "}
            <span className="esl-caret" aria-hidden="true" />
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Evidence ────────────────────────────────────────────────────────

function Evidence({ c }: { c: LandingContent }) {
  const e = c.evidence;
  return (
    <section className="esl-section esl-section--light esl-evidence">
      <div className="esl-container">
        <div className="esl-block">
          <p className="esl-eyebrow">{e.eyebrow}</p>
          <h2 className="esl-h2">{e.title}</h2>
          <p className="esl-lede">{e.subtitle}</p>
        </div>

        <div className="esl-ev-grid">
          {e.points.map((point, i) => {
            const Icon = EVIDENCE_ICONS[i] ?? IconCheck;
            return (
              <div className="esl-ev-card" key={point.title}>
                <Icon size={22} className="esl-ev-icon" />
                <h3 className="esl-h3">{point.title}</h3>
                <p className="esl-ev-card-blurb">{point.blurb}</p>
                {i === 0 ? (
                  <div className="esl-verdicts">
                    <span className="esl-verdict esl-mono">
                      <span
                        className="esl-verdict-dot esl-verdict-dot--ok"
                        aria-hidden="true"
                      />
                      {e.verdicts.ok}
                    </span>
                    <span className="esl-verdict esl-mono">
                      <span
                        className="esl-verdict-dot esl-verdict-dot--warn"
                        aria-hidden="true"
                      />
                      {e.verdicts.warn}
                    </span>
                    <span className="esl-verdict esl-mono">
                      <span
                        className="esl-verdict-dot esl-verdict-dot--err"
                        aria-hidden="true"
                      />
                      {e.verdicts.err}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="esl-boundary">{e.boundary}</p>
      </div>
    </section>
  );
}

// ─── Open source ─────────────────────────────────────────────────────

function OpenSource({ c }: { c: LandingContent }) {
  const o = c.openSource;
  return (
    <section
      id="open-source"
      className="esl-section esl-section--dark esl-open-source"
    >
      <div className="esl-container">
        <div className="esl-os-grid">
          <div className="esl-block">
            <p className="esl-eyebrow">{o.eyebrow}</p>
            <h2 className="esl-h2">{o.title}</h2>
            <p className="esl-lede">{o.subtitle}</p>
            <div style={{ marginTop: 28 }}>
              <a
                href={o.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="esl-textlink"
              >
                {o.cta.label} <IconExternal size={15} className="esl-arrow" />
              </a>
            </div>
          </div>
          <ul className="esl-os-list">
            {o.points.map((point) => (
              <li key={point}>
                <IconCheck size={18} className="esl-tick" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Bilingual ───────────────────────────────────────────────────────

function Bilingual({ c }: { c: LandingContent }) {
  const b = c.bilingual;
  return (
    <section className="esl-section esl-section--cream esl-section--compact">
      <div className="esl-container">
        <div className="esl-bilingual-row">
          <div className="esl-block" style={{ maxWidth: "42ch" }}>
            <h2
              className="esl-h3"
              style={{ fontSize: "clamp(1.35rem,1.1rem+1vw,1.75rem)" }}
            >
              {b.title}
            </h2>
            <p className="esl-small" style={{ marginTop: 10 }}>
              {b.subtitle}
            </p>
          </div>
          <a href={b.cta.href} className="esl-textlink">
            {b.cta.label} <IconArrowRight size={15} className="esl-arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────

function FinalCta({ c }: { c: LandingContent }) {
  const f = c.finalCta;
  return (
    <section className="esl-section esl-section--teal esl-final">
      <div
        className="esl-container esl-narrow"
        style={{ marginInline: "auto" }}
      >
        <h2 className="esl-h2">{f.title}</h2>
        <p className="esl-lede">{f.subtitle}</p>
        <div className="esl-final-cta">
          <PrimaryCta href={f.ctaPrimary.href} size="lg">
            {f.ctaPrimary.label}
          </PrimaryCta>
          <GhostCta href={f.ctaSecondary.href} size="lg">
            {f.ctaSecondary.label}
          </GhostCta>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function Footer({ c }: { c: LandingContent }) {
  const f = c.footer;
  return (
    <footer className="esl-footer">
      <div className="esl-container">
        <div className="esl-footer-top">
          <div className="esl-footer-brand">
            <a
              href="/"
              className="esl-mono"
              style={{ fontWeight: 600, fontSize: 16 }}
            >
              Echo<span className="echo-seo-accent">SEO</span>
            </a>
            <p className="esl-small">{f.tagline}</p>
            <div
              className="esl-newsletter"
              style={{ marginTop: 18, maxWidth: 360 }}
            >
              <NewsletterSignup locale={c.htmlLang === "vi" ? "vi" : "en"} />
            </div>
          </div>
          <div className="esl-footer-cols">
            {f.columns.map((col) => (
              <div className="esl-footer-col" key={col.title}>
                <p className="esl-footer-col-title">{col.title}</p>
                <div className="esl-footer-links">
                  {col.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a key={link.label} href={link.href}>
                        {link.label}
                      </a>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="esl-footer-bottom">
          <p className="esl-caption">{f.legal}</p>
          <a className="esl-footer-lang" href={f.langAlt.href}>
            {f.langAlt.label}
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function LandingPage({ locale = "en" }: { locale?: LandingLocale }) {
  const c = landingContent[locale];
  return (
    <div className="esl" lang={c.htmlLang}>
      <Hero c={c} />
      <Chips c={c} />
      <Workflows c={c} />
      <Agent c={c} />
      <Evidence c={c} />
      <OpenSource c={c} />
      <Bilingual c={c} />
      <FinalCta c={c} />
      <Footer c={c} />
    </div>
  );
}
