import { Link } from "@tanstack/react-router";
import { PanelLeftOpen, X } from "lucide-react";
import { useIntl } from "react-intl";
import { getProjectNavGroups } from "@/client/navigation/items";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { ProjectSwitcher } from "@/client/features/projects/ProjectSwitcher";

type SidebarMode = "full" | "drawer";

interface SidebarProps {
  projectId: string;
  /**
   * `full` is the persistent desktop sidebar (≥1280px): tool navigation only —
   * brand and project context live in the topbar. `drawer` is the modal overlay
   * on mobile and the tablet rail's expanded state: it also carries the brand,
   * a close control, and the project switcher.
   */
  mode: SidebarMode;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({
  projectId,
  mode,
  onNavigate,
  onClose,
}: SidebarProps) {
  const intl = useIntl();
  const isDrawer = mode === "drawer";

  return (
    <div
      className={`sidebar flex h-full flex-col border-r border-base-300 bg-base-100 ${
        isDrawer ? "w-72" : "w-60"
      }`}
    >
      {isDrawer ? (
        <>
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
            <EchoSeoLogo variant="lockup" className="text-base-content" />
            {onClose ? (
              <button
                onClick={onClose}
                className="btn btn-ghost btn-circle min-h-11 min-w-11"
                aria-label={intl.formatMessage({ id: "nav.closeSidebar" })}
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <div className="border-b border-base-300 px-3 py-3">
            <ProjectSwitcher
              activeProjectId={projectId}
              variant="sidebar"
              onCloseDrawer={onNavigate}
            />
          </div>
        </>
      ) : null}

      <SidebarNavList projectId={projectId} onNavigate={onNavigate} />
    </div>
  );
}

function SidebarNavList({
  projectId,
  onNavigate,
}: {
  projectId: string;
  onNavigate?: () => void;
}) {
  const intl = useIntl();
  const navGroups = getProjectNavGroups(projectId);

  return (
    <nav
      aria-label={intl.formatMessage({ id: "shell.primaryNavigation" })}
      className="flex-1 overflow-y-auto py-2 pl-3"
    >
      {navGroups.map((entry) => {
        if (entry.type === "standalone") {
          const {
            icon: Icon,
            labelId,
            matchSegment,
            ...linkProps
          } = entry.item;
          return (
            <Link
              key={linkProps.to}
              {...linkProps}
              onClick={onNavigate}
              activeOptions={{
                exact: matchSegment === "/",
                includeSearch: false,
              }}
              className="relative flex min-h-11 items-center gap-3 px-4 py-2 text-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
              activeProps={{ className: "text-base-content font-medium" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {isActive ? (
                    <div className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-full bg-primary" />
                  ) : null}
                  <Icon className="h-5 w-5 shrink-0" />
                  {intl.formatMessage({ id: labelId })}
                </>
              )}
            </Link>
          );
        }

        return (
          <div key={entry.labelId} className="mb-2">
            <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-base-content/40">
              {intl.formatMessage({ id: entry.labelId })}
            </div>
            {entry.items.map((item) => {
              const { icon: Icon, labelId, matchSegment, ...linkProps } = item;
              return (
                <Link
                  key={linkProps.to}
                  {...linkProps}
                  onClick={onNavigate}
                  activeOptions={{
                    exact: matchSegment === "/",
                    includeSearch: false,
                  }}
                  className="relative flex min-h-11 items-center gap-3 px-4 py-2 text-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
                  activeProps={{ className: "text-base-content font-medium" }}
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      {isActive ? (
                        <div className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-full bg-primary" />
                      ) : null}
                      <Icon className="h-5 w-5 shrink-0" />
                      {intl.formatMessage({ id: labelId })}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The tablet-width (768–1279px) collapsed rail: a single labelled icon per
 * navigation destination plus an expand control that opens the full drawer
 * overlay. Every icon carries a localized accessible name and a hover tooltip,
 * and the rail is the only navigation representation exposed at this width.
 */
export function SidebarRail({
  projectId,
  onExpand,
}: {
  projectId: string;
  onExpand: () => void;
}) {
  const intl = useIntl();
  const items = getProjectNavGroups(projectId).flatMap((entry) =>
    entry.type === "standalone" ? [entry.item] : entry.items,
  );

  return (
    <nav
      aria-label={intl.formatMessage({ id: "shell.primaryNavigation" })}
      className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-base-300 bg-base-100 py-2"
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label={intl.formatMessage({ id: "shell.expandNavigation" })}
        className="signal-focus tooltip tooltip-right flex size-11 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
        data-tip={intl.formatMessage({ id: "shell.expandNavigation" })}
      >
        <PanelLeftOpen className="h-5 w-5" />
      </button>
      <div className="signal-divider w-8" />
      {items.map((item) => {
        const { icon: Icon, labelId, matchSegment, ...linkProps } = item;
        const label = intl.formatMessage({ id: labelId });
        return (
          <Link
            key={linkProps.to}
            {...linkProps}
            aria-label={label}
            data-tip={label}
            activeOptions={{
              exact: matchSegment === "/",
              includeSearch: false,
            }}
            className="signal-focus tooltip tooltip-right relative flex size-11 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            activeProps={{
              className: "bg-primary/10 text-primary",
            }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {isActive ? (
                  <div className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-primary" />
                ) : null}
                <Icon className="h-5 w-5" />
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
