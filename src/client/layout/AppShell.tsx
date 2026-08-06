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
import { BILLING_ROUTE } from "@/shared/billing";
import { getSeoApiKeyStatus } from "@/serverFunctions/config";
import { getProjects } from "@/serverFunctions/projects";
import { ProjectSwitcher } from "@/client/features/projects/ProjectSwitcher";
import { OrgSwitcherSection } from "@/client/features/organizations/OrgSwitcher";
import { getLastProjectId } from "@/client/lib/active-project";

const DATAFORSEO_HELP_PATH = "/help/dataforseo-api-key";
const SUPPORT_PATH = "/support";
const MAIN_CONTENT_ID = "app-main-content";

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
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [showMissingSeoApiKeyModal, setShowMissingSeoApiKeyModal] =
    React.useState(false);
  // Tracks the last known `configured` value so the setup modal auto-opens only
  // on the transition into an unconfigured state — not on every route change or
  // background refetch (which is what made the popup "keep coming back").
  const prevSeoApiKeyConfiguredRef = React.useRef<boolean | null>(null);
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
  const isSeoApiKeyConfigured = shouldCheckSeoApiKeyStatus
    ? (seoApiKeyStatusQuery.data?.configured ?? null)
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

    const configured = seoApiKeyStatusQuery.data.configured;
    const prevConfigured = prevSeoApiKeyConfiguredRef.current;
    prevSeoApiKeyConfiguredRef.current = configured;

    if (configured) {
      // Key is set — close the modal and let it re-arm for a future removal.
      setShowMissingSeoApiKeyModal(false);
    } else if (prevConfigured !== false) {
      // First time we learn the key is missing, or it was just removed
      // (configured -> unconfigured): open once. If it was already known
      // missing, leave the user's choice alone — the persistent banner keeps
      // the CTA visible, so we never re-open on navigation or refetch.
      setShowMissingSeoApiKeyModal(true);
    }
  }, [
    seoApiKeyStatusQuery.data,
    seoApiKeyStatusQuery.isError,
    seoApiKeyStatusQuery.isSuccess,
    shouldCheckSeoApiKeyStatus,
  ]);

  const shouldShowMissingSeoApiKeyModal =
    showMissingSeoApiKeyModal && location.pathname !== DATAFORSEO_HELP_PATH;

  const shouldShowSeoApiWarning =
    !seoApiKeyStatusError &&
    isSeoApiKeyConfigured === false &&
    !shouldShowMissingSeoApiKeyModal;

  const closeSetupModal = React.useCallback(
    () => setShowMissingSeoApiKeyModal(false),
    [],
  );
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
