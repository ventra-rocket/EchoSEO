import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useIntl } from "react-intl";
import { getProjectNavGroups } from "@/client/navigation/items";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { ProjectSwitcher } from "@/client/features/projects/ProjectSwitcher";

interface SidebarProps {
  projectId: string;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ projectId, onNavigate, onClose }: SidebarProps) {
  const intl = useIntl();
  const navGroups = getProjectNavGroups(projectId);

  return (
    <div className="sidebar w-64 border-r border-base-300 h-full bg-base-100 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-base-300 flex items-center justify-between">
        <EchoSeoLogo variant="lockup" className="text-base-content" />
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label={intl.formatMessage({ id: "nav.closeSidebar" })}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Project picker */}
      <div className="px-3 py-3 border-b border-base-300">
        <ProjectSwitcher
          activeProjectId={projectId}
          variant="sidebar"
          onCloseDrawer={onNavigate}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 pl-3 overflow-y-auto">
        {navGroups.map((entry) => {
          if (entry.type === "standalone") {
            const { icon: Icon, labelId, ...linkProps } = entry.item;
            return (
              <Link
                key={linkProps.to}
                {...linkProps}
                onClick={onNavigate}
                activeOptions={{ exact: false, includeSearch: false }}
                className="relative flex items-center gap-3 px-4 py-2 text-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
                activeProps={{ className: "text-base-content font-medium" }}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    {isActive ? (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
                    ) : null}
                    <Icon className="h-5 w-5" />
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
                const { icon: Icon, labelId, ...linkProps } = item;
                return (
                  <Link
                    key={linkProps.to}
                    {...linkProps}
                    onClick={onNavigate}
                    activeOptions={{ exact: false, includeSearch: false }}
                    className="relative flex items-center gap-3 px-4 py-2 text-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
                    activeProps={{ className: "text-base-content font-medium" }}
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <>
                        {isActive ? (
                          <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
                        ) : null}
                        <Icon className="h-5 w-5" />
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
    </div>
  );
}
