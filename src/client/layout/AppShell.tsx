import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { LanguageSwitcher } from "@/client/i18n/LanguageSwitcher";
import {
  CircleHelp,
  CreditCard,
  Menu,
  Settings,
  User,
  Users,
} from "lucide-react";
import {
  AppContent,
  MissingSeoSetupModal,
  NavDrawer,
  SeoApiStatusBanners,
} from "@/client/layout/AppShellParts";
import { GscReEngagementModal } from "@/client/features/gsc/GscReEngagementModal";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getActiveOrganizationId } from "@/lib/auth-session";
import { BILLING_ROUTE } from "@/shared/billing";
import { getSeoApiKeyStatus } from "@/serverFunctions/config";
import { getProjects } from "@/serverFunctions/projects";
import { ProjectSwitcher } from "@/client/features/projects/ProjectSwitcher";
import { OrgSwitcherSection } from "@/client/features/organizations/OrgSwitcher";
import { getLastProjectId } from "@/client/lib/active-project";
import {
  getSeoKeyConfiguredHint,
  resolveSeoKeyConfigured,
  setSeoKeyConfiguredHint,
} from "@/client/features/access-gate/seo-key-hint";

const DATAFORSEO_HELP_PATH = "/help/dataforseo-api-key";
const SUPPORT_PATH = "/support";
const MAIN_CONTENT_ID = "app-main-content";

// The DataForSEO setup modal auto-opens once to prompt a missing key, then must
// stay dismissed. It can't use component state/ref: there are two
// AuthenticatedAppLayout instances (one per layout route) and TanStack remounts
// on cross-layout navigation, which resets a ref and re-pops the modal on every
// move. sessionStorage survives remounts and reloads within the tab; the
// persistent banner carries the CTA after dismissal.
const SEO_SETUP_MODAL_DISMISSED_KEY = "echoseo:dataforseo-setup-dismissed";

function isSeoSetupModalDismissed() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SEO_SETUP_MODAL_DISMISSED_KEY) === "1";
}

function setSeoSetupModalDismissed(dismissed: boolean) {
  if (typeof window === "undefined") return;
  if (dismissed) {
    window.sessionStorage.setItem(SEO_SETUP_MODAL_DISMISSED_KEY, "1");
  } else {
    window.sessionStorage.removeItem(SEO_SETUP_MODAL_DISMISSED_KEY);
  }
}

export function AuthenticatedAppLayout({
  children,
  projectId,
  banner,
}: {
  children: React.ReactNode;
  projectId?: string;
  banner?: React.ReactNode;
}) {
  const intl = useIntl();
  const location = useLocation();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [showMissingSeoApiKeyModal, setShowMissingSeoApiKeyModal] =
    React.useState(false);
  // On non-project pages (e.g. /settings) there's no projectId in the URL, so
  // derive one for the nav/switcher: prefer the last-visited project, else the
  // most recent. Reading localStorage in an effect keeps SSR/first render stable.
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
    enabled: !projectId,
  });
  const [rememberedProjectId, setRememberedProjectId] = React.useState<
    string | null
  >(null);
  React.useEffect(() => {
    setRememberedProjectId(getLastProjectId());
  }, []);
  const fallbackProjects = projectsQuery.data ?? [];
  const fallbackProjectId =
    fallbackProjects.find((project) => project.id === rememberedProjectId)
      ?.id ??
    fallbackProjects[0]?.id ??
    null;
  const headerProjectId = projectId ?? fallbackProjectId;
  const shouldCheckSeoApiKeyStatus = location.pathname !== BILLING_ROUTE;
  const seoApiKeyStatusQuery = useQuery({
    queryKey: ["seoApiKeyStatus"],
    queryFn: () => getSeoApiKeyStatus(),
    enabled: shouldCheckSeoApiKeyStatus,
  });
  // The status is a client query, so it lands after the first paint and the
  // banner it drives would push the whole page down when it does. The previous
  // answer this workspace saw stands in until then; `resolveSeoKeyConfigured`
  // owns when that is safe. `projectId` covers the first render while the
  // session query is still resolving.
  const seoKeyHintScope = getActiveOrganizationId(session) ?? projectId ?? null;
  const seoKeyHint = React.useMemo(
    () => getSeoKeyConfiguredHint(seoKeyHintScope),
    [seoKeyHintScope],
  );
  const isSeoApiKeyConfigured = shouldCheckSeoApiKeyStatus
    ? resolveSeoKeyConfigured({
        answer: seoApiKeyStatusQuery.data?.configured ?? null,
        hint: seoKeyHint,
        setupModalDismissed: isSeoSetupModalDismissed(),
      })
    : null;
  const seoApiKeyStatusError =
    shouldCheckSeoApiKeyStatus && seoApiKeyStatusQuery.isError;

  React.useEffect(() => {
    if (!shouldCheckSeoApiKeyStatus) {
      setShowMissingSeoApiKeyModal(false);
      return;
    }

    if (seoApiKeyStatusQuery.isError) {
      setShowMissingSeoApiKeyModal(false);
      return;
    }

    if (!seoApiKeyStatusQuery.isSuccess) return;

    // Remember it for the next first paint, before acting on it.
    setSeoKeyConfiguredHint(
      seoKeyHintScope,
      seoApiKeyStatusQuery.data.configured,
    );

    if (seoApiKeyStatusQuery.data.configured) {
      // Key is set — close and re-arm so a future removal prompts once more.
      setSeoSetupModalDismissed(false);
      setShowMissingSeoApiKeyModal(false);
    } else if (!isSeoSetupModalDismissed()) {
      // Key missing and not yet dismissed this session: open once. The
      // dismissal lives in sessionStorage so it survives AppShell remounts and
      // navigation — the banner carries the CTA afterward, so we never re-pop.
      setShowMissingSeoApiKeyModal(true);
    }
  }, [
    seoApiKeyStatusQuery.data,
    seoApiKeyStatusQuery.isError,
    seoApiKeyStatusQuery.isSuccess,
    shouldCheckSeoApiKeyStatus,
    seoKeyHintScope,
  ]);

  const shouldShowMissingSeoApiKeyModal =
    showMissingSeoApiKeyModal && location.pathname !== DATAFORSEO_HELP_PATH;

  const shouldShowSeoApiWarning =
    !seoApiKeyStatusError &&
    isSeoApiKeyConfigured === false &&
    !shouldShowMissingSeoApiKeyModal;

  const closeSetupModal = React.useCallback(() => {
    setSeoSetupModalDismissed(true);
    setShowMissingSeoApiKeyModal(false);
  }, []);
  const openDrawer = React.useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  React.useEffect(() => {
    if (!projectId) {
      setDrawerOpen(false);
    }
  }, [projectId]);

  // The drawer only exists below the desktop breakpoint (its overlay is
  // `xl:hidden`). If the viewport crosses into desktop while the drawer is open,
  // close it — otherwise the shell stays `inert` behind a now-hidden dialog and
  // the whole app becomes uninteractable.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const desktop = window.matchMedia("(min-width: 1280px)");
    if (desktop.matches) {
      setDrawerOpen(false);
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [drawerOpen]);

  const focusMainContent = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const main = document.getElementById(MAIN_CONTENT_ID);
      main?.focus();
      main?.scrollIntoView();
    },
    [],
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-base-200">
      {/* The whole shell goes inert while the drawer owns the screen, so focus
          stays trapped in the dialog and the background is hidden from AT. */}
      <div inert={drawerOpen} className="flex h-full min-h-0 flex-col">
        {/* Kept in the tab order at full size and pushed off-screen with a
            transform (not clipped to 1px like sr-only, which some browsers drop
            from sequential focus), so it is reliably the first Tab stop and
            reveals itself on focus. */}
        <a
          href={`#${MAIN_CONTENT_ID}`}
          onClick={focusMainContent}
          className="signal-focus fixed left-4 top-3 z-[60] -translate-y-20 rounded-lg border border-base-300 bg-base-100 px-4 py-2 text-sm font-medium text-base-content shadow-lg focus:translate-y-0"
        >
          {intl.formatMessage({ id: "shell.skipToContent" })}
        </a>

        <TopNav
          drawerOpen={drawerOpen}
          projectId={headerProjectId}
          pathname={location.pathname}
          onOpenDrawer={openDrawer}
        />

        <SeoApiStatusBanners
          shouldShowSeoApiWarning={shouldShowSeoApiWarning}
          seoApiKeyStatusError={seoApiKeyStatusError}
        />

        {banner}

        <AppContent projectId={headerProjectId} onExpandNav={openDrawer}>
          {children}
        </AppContent>
      </div>

      <NavDrawer
        open={drawerOpen}
        projectId={headerProjectId}
        onClose={closeDrawer}
      />

      <MissingSeoSetupModal
        isOpen={shouldShowMissingSeoApiKeyModal}
        onClose={closeSetupModal}
      />

      <GscReEngagementModal
        projectId={headerProjectId}
        suppressed={shouldShowMissingSeoApiKeyModal}
      />
    </div>
  );
}

function TopNav({
  drawerOpen,
  projectId,
  pathname,
  onOpenDrawer,
}: {
  drawerOpen: boolean;
  projectId: string | null;
  pathname: string;
  onOpenDrawer: () => void;
}) {
  const intl = useIntl();
  const isSupportActive = pathname === SUPPORT_PATH;

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-base-300 bg-base-100 px-2 sm:px-3">
      <div className="flex flex-none items-center gap-1">
        {projectId ? (
          <button
            type="button"
            className="btn btn-square btn-ghost min-h-11 min-w-11 md:hidden"
            aria-label={intl.formatMessage({ id: "nav.toggleSidebar" })}
            aria-expanded={drawerOpen}
            onClick={onOpenDrawer}
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <Link
          to="/"
          className="ml-1 flex items-center text-base-content"
          aria-label="EchoSEO"
        >
          <EchoSeoLogo variant="lockup" />
        </Link>
      </div>

      <div className="flex-1" />

      <div className="hidden flex-none items-center gap-2 md:flex">
        <LanguageSwitcher />
        <div
          className="tooltip tooltip-bottom"
          data-tip={intl.formatMessage({ id: "account.help" })}
        >
          <Link
            to={SUPPORT_PATH}
            className={`btn btn-ghost btn-circle btn-sm ${
              isSupportActive
                ? "bg-primary/10 text-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <CircleHelp className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center rounded-full border border-base-300 bg-base-100/70 px-1 py-1 shadow-sm">
          <ProjectSwitcher activeProjectId={projectId} variant="topbar" />

          <AccountMenu />
        </div>
      </div>

      <AccountMenu mobileOnly />
    </div>
  );
}

function AccountMenu({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const intl = useIntl();
  const { data: session } = useSession();
  const isHostedMode = isHostedClientAuthMode();
  const email = session?.user?.email;

  const handleSignOut = () => signOutAndRedirect();

  const menu = (
    <div className={mobileOnly ? "ml-1 flex-none md:hidden" : "flex-none"}>
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className={`btn btn-ghost btn-circle btn-sm ${mobileOnly ? "" : "hover:bg-base-200/80"}`}
          aria-label={intl.formatMessage({ id: "account.menuLabel" })}
        >
          <User className="h-5 w-5" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-20 menu mt-3 min-w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          {email ? (
            <li className="menu-title max-w-full">
              <span className="truncate text-base-content" data-ph-mask>
                {email}
              </span>
            </li>
          ) : null}
          {isHostedMode ? <OrgSwitcherSection /> : null}
          {mobileOnly ? (
            <li>
              <Link to={SUPPORT_PATH} className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4" />
                {intl.formatMessage({ id: "account.help" })}
              </Link>
            </li>
          ) : null}
          {isHostedMode ? (
            <li>
              <Link to={BILLING_ROUTE} className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {intl.formatMessage({ id: "account.billing" })}
              </Link>
            </li>
          ) : null}
          {isHostedMode ? (
            <li>
              <Link to="/members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {intl.formatMessage({ id: "account.members" })}
              </Link>
            </li>
          ) : null}
          <li>
            <Link to="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {intl.formatMessage({ id: "account.settings" })}
            </Link>
          </li>
          {isHostedMode && email ? (
            <li>
              <button
                type="button"
                className="text-error"
                onClick={handleSignOut}
              >
                {intl.formatMessage({ id: "account.signOut" })}
              </button>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );

  if (mobileOnly) {
    return menu;
  }

  return (
    <>
      <div className="mx-1 h-6 w-px bg-base-300" />
      {menu}
    </>
  );
}
