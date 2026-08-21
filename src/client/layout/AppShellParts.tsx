import * as React from "react";
import { Link } from "@tanstack/react-router";
import { FormattedMessage, useIntl } from "react-intl";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Sidebar, SidebarRail } from "@/client/components/Sidebar";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";

function SeoApiStatusBanners({
  shouldShowSeoApiWarning,
  seoApiKeyStatusError,
}: {
  shouldShowSeoApiWarning: boolean;
  seoApiKeyStatusError: boolean;
}) {
  return (
    <>
      {shouldShowSeoApiWarning ? (
        <div className="shrink-0 px-4 py-2.5 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="alert alert-warning">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="text-sm">
                <FormattedMessage
                  id="shell.setupNeeded.warning"
                  values={{
                    helpLink: (chunks) => (
                      <Link
                        {...dataforseoHelpLinkOptions}
                        className="link link-primary font-medium"
                      >
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {seoApiKeyStatusError ? (
        <div className="shrink-0 px-4 py-2.5 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="alert alert-info">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="text-sm">
                <FormattedMessage
                  id="shell.setupNeeded.verifyError"
                  values={{
                    helpLink: (chunks) => (
                      <Link
                        {...dataforseoHelpLinkOptions}
                        className="link link-primary font-medium"
                      >
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * The responsive work area beneath the topbar: a persistent icon rail at tablet
 * width (768–1279px), a persistent full sidebar at desktop width (≥1280px), and
 * the single scroll container that owns page content in every mode. The scroll
 * container is the stable skip-link target (`#app-main-content`); pages keep
 * their own `<main>` inside it. The mobile (<768px) drawer is rendered at the
 * shell root as a modal, not here.
 */
function AppContent({
  projectId,
  onExpandNav,
  children,
}: {
  projectId: string | null;
  onExpandNav: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      {projectId ? (
        <>
          <div className="hidden md:flex xl:hidden">
            <SidebarRail projectId={projectId} onExpand={onExpandNav} />
          </div>
          <div className="hidden xl:flex">
            <Sidebar mode="full" projectId={projectId} />
          </div>
        </>
      ) : null}

      <div
        id="app-main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 overflow-auto outline-none"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The mobile/tablet navigation drawer: an `aria-modal` dialog carrying the full
 * grouped sidebar. It owns Escape, backdrop close, focus containment, and
 * restores focus to whatever opened it on every close path. Never mounted at
 * desktop width, where the full sidebar is persistent.
 */
function NavDrawer({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}) {
  const intl = useIntl();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  useFocusTrap({ active: open, containerRef: dialogRef, onEscape: onClose });

  if (!open || !projectId) return null;

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        type="button"
        data-testid="nav-drawer-backdrop"
        aria-label={intl.formatMessage({ id: "nav.closeSidebar" })}
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={intl.formatMessage({ id: "shell.navigationMenu" })}
        className="absolute left-0 top-0 h-full outline-none"
      >
        <Sidebar
          mode="drawer"
          projectId={projectId}
          onNavigate={onClose}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function MissingSeoSetupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  useFocusTrap({ active: isOpen, containerRef: dialogRef, onEscape: onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataforseo-setup-title"
        aria-describedby="dataforseo-setup-description"
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl border border-base-300 bg-base-100 p-5 shadow-2xl outline-none"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-warning/20 p-2 text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <h2
              id="dataforseo-setup-title"
              className="text-lg font-semibold text-base-content"
            >
              One quick setup step
            </h2>
            <p
              id="dataforseo-setup-description"
              className="text-sm text-base-content/75"
            >
              Add your DataForSEO API key to start using EchoSEO.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Dismiss
          </button>
          <Link
            {...dataforseoHelpLinkOptions}
            className="btn btn-primary"
            onClick={onClose}
          >
            Open setup guide
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Focusable descendants in DOM order, skipping hidden ones. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.offsetParent !== null,
  );
}

/**
 * Modal focus lifecycle shared by the nav drawer and the DataForSEO setup
 * modal: move focus in on open, contain Tab/Shift+Tab, close on Escape, and
 * restore focus to the previously focused element (the opening trigger) on
 * every close path. `onEscape` must be referentially stable so the effect only
 * re-runs when `active` flips.
 */
function useFocusTrap({
  active,
  containerRef,
  onEscape,
}: {
  active: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  onEscape: () => void;
}) {
  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const activeOnOpen = document.activeElement;
    const previouslyFocused =
      activeOnOpen instanceof HTMLElement ? activeOnOpen : null;

    const focusInitial = () => {
      const target = getFocusable(container)[0] ?? container;
      target.focus();
    };
    focusInitial();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, onEscape]);
}

export { AppContent, MissingSeoSetupModal, NavDrawer, SeoApiStatusBanners };
