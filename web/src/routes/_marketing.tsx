import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { EchoSeoLogo } from "@/components/echoseo-logo";
import { SiteFooter } from "@/components/site-footer";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { IconClose, IconMenu } from "@/components/landing-icons";
import {
  landingContent,
  URLS,
  type LandingLocale,
} from "@/components/landing-content";

export const Route = createFileRoute("/_marketing")({
  component: MarketingLayout,
});

function localeFor(pathname: string): LandingLocale {
  return pathname === "/vi" || pathname.startsWith("/vi/") ? "vi" : "en";
}

function MarketingLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const locale = localeFor(pathname);
  const nav = landingContent[locale].nav;
  const freeCheck = URLS.freeCheck[locale];
  // The home routes ("/" and "/vi") own the full-viewport landing (with its own
  // footer); every other marketing page gets the light content canvas.
  const isHome = pathname === "/" || pathname === "/vi";
  // On home the sticky header sits on the deep-teal hero band, so it blends into
  // the band (teal fill, light text, amber CTA) instead of a heavy dark bar.
  const onTeal = isHome;
  const headerCls = onTeal
    ? // Solid teal (not /95): a translucent bar lets a white section behind it
      // lift the effective background, dropping white/80 nav text below AA.
      "sticky top-0 z-50 border-b border-white/12 bg-[#0a6b54]"
    : "sticky top-0 z-50 border-b border-[#26313e] bg-[#0b0f14]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0b0f14]/80";
  const navLinkCls = onTeal
    ? "text-sm font-medium text-white/80 transition-colors hover:text-white"
    : "text-sm font-medium text-[#aeb6c0] transition-colors hover:text-[#e6eaf0]";

  // Close the mobile drawer on Escape, returning focus to the trigger so a
  // keyboard user isn't stranded when the focused drawer element unmounts.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#19e3b1] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0b0f14]"
      >
        {locale === "vi" ? "Tới nội dung chính" : "Skip to content"}
      </a>

      <header className={headerCls}>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
          <a
            href={locale === "vi" ? "/vi" : "/"}
            className={`transition-opacity hover:opacity-80 ${onTeal ? "esl-home-logo text-white" : "text-[#e6eaf0]"}`}
            style={
              onTeal
                ? ({
                    ["--echo-primary" as string]: "#eafff8",
                    ["--echo-accent" as string]: "#f5a524",
                  } as CSSProperties)
                : undefined
            }
            aria-label="EchoSEO"
          >
            <EchoSeoLogo variant="lockup" className="text-[15px]" />
          </a>

          <nav
            className="hidden items-center gap-6 lg:flex"
            aria-label={locale === "vi" ? "Điều hướng chính" : "Primary"}
          >
            <ProductMenu nav={nav} onTeal={onTeal} />
            <a
              href={locale === "vi" ? "/vi#open-source" : "/#open-source"}
              className={navLinkCls}
            >
              {nav.openSource}
            </a>
            <a href={freeCheck} className={navLinkCls}>
              {nav.freeCheck}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LangSwitch locale={locale} onTeal={onTeal} />
            <a
              href={URLS.signIn}
              className={`hidden h-9 items-center rounded-lg px-3 lg:inline-flex ${navLinkCls}`}
            >
              {nav.signIn}
            </a>
            <a
              href={URLS.signUp}
              className="hidden h-9 items-center rounded-lg bg-[#f5a524] px-4 text-sm font-semibold text-[#231500] transition-colors hover:bg-[#f7b445] lg:inline-flex"
            >
              {nav.startFree}
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={mobileOpen ? nav.menuClose : nav.menuOpen}
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileOpen((o) => !o)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors lg:hidden ${onTeal ? "text-white hover:bg-white/10" : "text-[#e6eaf0] hover:bg-[#182330]"}`}
            >
              {mobileOpen ? <IconClose size={26} /> : <IconMenu size={26} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <MobileDrawer
          nav={nav}
          locale={locale}
          freeCheck={freeCheck}
          onClose={() => setMobileOpen(false)}
        />
      ) : null}

      <main
        id="main"
        className={isHome ? undefined : "min-h-screen bg-[#f5f1ec]"}
      >
        {isHome ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <Outlet />
            <MarketingFooter locale={locale} />
          </div>
        )}
      </main>
    </>
  );
}

function LangSwitch({
  locale,
  onTeal,
}: {
  locale: LandingLocale;
  onTeal: boolean;
}) {
  const base = "px-2 py-1 text-xs font-semibold rounded transition-colors";
  const border = onTeal ? "border-white/55" : "border-[#26313e]";
  const active = onTeal
    ? "bg-white/15 text-white"
    : "bg-[#182330] text-[#e6eaf0]";
  // white/80 ≈ 4.9:1 on the solid teal header — AA for the 12px labels (white/60
  // was 3.4:1).
  const idle = onTeal
    ? "text-white/80 hover:text-white"
    : "text-[#8b95a1] hover:text-[#e6eaf0]";
  return (
    <div
      className={`hidden items-center rounded-lg border p-0.5 sm:inline-flex ${border}`}
      role="group"
      aria-label="Language"
    >
      <a
        href="/"
        aria-current={locale === "en" ? "true" : undefined}
        className={`${base} ${locale === "en" ? active : idle}`}
      >
        EN
      </a>
      <a
        href="/vi"
        aria-current={locale === "vi" ? "true" : undefined}
        className={`${base} ${locale === "vi" ? active : idle}`}
      >
        VI
      </a>
    </div>
  );
}

type NavContent = (typeof landingContent)["en"]["nav"];

function ProductMenu({ nav, onTeal }: { nav: NavContent; onTeal: boolean }) {
  // A disclosure (not an ARIA menu — the panel holds navigation links): the
  // button owns an honest aria-expanded, Escape and focus-out close it, and the
  // CSS hover/focus-within still opens it for pointer users.
  const [open, setOpen] = useState(false);
  return (
    <div
      className="group relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex h-10 items-center gap-1 text-sm font-medium transition-colors ${onTeal ? "text-white/80 hover:text-white" : "text-[#aeb6c0] hover:text-[#e6eaf0]"}`}
      >
        {nav.product}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className={`absolute left-0 top-[calc(100%-2px)] z-20 hidden w-[600px] max-w-[calc(100vw-2rem)] pt-3 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:block ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="rounded-xl border border-[#26313e] bg-[#0f151c] p-5 shadow-2xl shadow-black/40">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {nav.productGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7f8a97]">
                  {group.label}
                </p>
                <div className="mt-3 flex flex-col gap-1">
                  {group.items.map((item) => (
                    <a
                      key={item.slug}
                      href={`/features/${item.slug}`}
                      className="rounded-md px-2 py-1.5 text-sm font-medium text-[#d4dae2] transition-colors hover:bg-[#182330] hover:text-white"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7f8a97]">
                {nav.agentsHeading}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={URLS.mcp}
                  className="rounded-md p-2 transition-colors hover:bg-[#182330]"
                >
                  <span className="block text-sm font-semibold text-[#e6eaf0]">
                    {nav.mcpName}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#8b95a1]">
                    {nav.mcpBlurb}
                  </span>
                </a>
                <a
                  href={URLS.searchConsoleMcp}
                  className="rounded-md p-2 transition-colors hover:bg-[#182330]"
                >
                  <span className="block text-sm font-semibold text-[#e6eaf0]">
                    {nav.scMcpName}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#8b95a1]">
                    {nav.scMcpBlurb}
                  </span>
                </a>
                <a
                  href={URLS.features}
                  className="rounded-md border border-[#26313e] px-2 py-1.5 text-sm font-medium text-[#e6eaf0] transition-colors hover:border-[#19e3b1]"
                >
                  {nav.allFeatures} <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDrawer({
  nav,
  locale,
  freeCheck,
  onClose,
}: {
  nav: NavContent;
  locale: LandingLocale;
  freeCheck: string;
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLAnchorElement>(null);
  const trapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // Keep Tab focus inside the open drawer (Escape closes it — see the layout's
  // keydown effect); prevents keyboard users tabbing into the obscured page.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = trapRef.current?.querySelectorAll<HTMLElement>(
      "a[href],button:not([disabled])",
    );
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      id="mobile-drawer"
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={locale === "vi" ? "Menu điều hướng" : "Navigation menu"}
      onKeyDown={onKeyDown}
      className="fixed inset-0 top-16 z-40 overflow-y-auto bg-[#0b0f14] px-6 pb-10 pt-4 lg:hidden"
    >
      <div className="flex flex-col gap-1">
        <a
          ref={firstRef}
          href={URLS.signUp}
          onClick={onClose}
          className="flex h-12 items-center justify-center rounded-lg bg-[#f5a524] px-4 text-sm font-semibold text-[#231500]"
        >
          {nav.startFree}
        </a>
        <a
          href={freeCheck}
          onClick={onClose}
          className="mt-2 flex h-12 items-center justify-center rounded-lg border border-[#26313e] px-4 text-sm font-semibold text-[#e6eaf0]"
        >
          {nav.freeCheck}
        </a>
      </div>

      <nav
        className="mt-6 flex flex-col"
        aria-label={locale === "vi" ? "Điều hướng" : "Menu"}
      >
        <p className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-[#7f8a97]">
          {nav.product}
        </p>
        {nav.productGroups
          .flatMap((g) => g.items)
          .map((item) => (
            <a
              key={item.slug}
              href={`/features/${item.slug}`}
              onClick={onClose}
              className="flex min-h-12 items-center rounded-lg px-1 text-[15px] font-medium text-[#d4dae2] hover:bg-[#182330]"
            >
              {item.name}
            </a>
          ))}
        <a
          href={URLS.mcp}
          onClick={onClose}
          className="flex min-h-12 items-center rounded-lg px-1 text-[15px] font-medium text-[#d4dae2] hover:bg-[#182330]"
        >
          {nav.mcpName}
        </a>
        <a
          href={locale === "vi" ? "/vi#open-source" : "/#open-source"}
          onClick={onClose}
          className="flex min-h-12 items-center rounded-lg px-1 text-[15px] font-medium text-[#d4dae2] hover:bg-[#182330]"
        >
          {nav.openSource}
        </a>
        <a
          href={URLS.signIn}
          onClick={onClose}
          className="flex min-h-12 items-center rounded-lg px-1 text-[15px] font-medium text-[#d4dae2] hover:bg-[#182330]"
        >
          {nav.signIn}
        </a>
      </nav>

      <div className="mt-6 flex items-center gap-3 border-t border-[#26313e] pt-4">
        <span className="text-xs text-[#7f8a97]">{nav.langSwitchLabel}:</span>
        <a
          href="/"
          onClick={onClose}
          aria-current={locale === "en" ? "true" : undefined}
          className={`text-sm font-semibold ${locale === "en" ? "text-[#19e3b1]" : "text-[#8b95a1]"}`}
        >
          EN
        </a>
        <a
          href="/vi"
          onClick={onClose}
          aria-current={locale === "vi" ? "true" : undefined}
          className={`text-sm font-semibold ${locale === "vi" ? "text-[#19e3b1]" : "text-[#8b95a1]"}`}
        >
          VI
        </a>
      </div>
    </div>
  );
}

/** Footer for non-home marketing pages (features/pricing/etc.). */
function MarketingFooter({ locale }: { locale: LandingLocale }) {
  return (
    <>
      <div className="mt-16 border-t border-[var(--color-border-subtle)] pt-8">
        <p className="text-sm font-semibold text-neutral-900">
          Stay in the loop
        </p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          Product updates, new features, and the occasional behind-the-scenes.
        </p>
        <div className="mt-3">
          <NewsletterSignup locale={locale} />
        </div>
      </div>
      <div className="mt-8">
        <SiteFooter className="text-xs text-neutral-600 [&_a]:transition-colors [&_a]:hover:text-neutral-900" />
      </div>
    </>
  );
}
