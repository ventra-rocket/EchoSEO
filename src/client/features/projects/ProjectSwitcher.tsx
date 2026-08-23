import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { Check, ChevronsUpDown, FolderCog, Search } from "lucide-react";
import { getProjects } from "@/serverFunctions/projects";
import { setLastProjectId } from "@/client/lib/active-project";
import type { ProjectSummary } from "./types";

// Below this many projects the plain list is faster to scan than a search box.
const SEARCH_THRESHOLD = 8;

function closeDropdown() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function ProjectSwitcher({
  activeProjectId,
  variant = "topbar",
  onCloseDrawer,
}: {
  activeProjectId: string | null;
  variant?: "topbar" | "sidebar";
  // Mobile sidebar passes this so switching / navigating away also closes the
  // drawer overlay.
  onCloseDrawer?: () => void;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  const isSidebar = variant === "sidebar";

  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const showSearch = projects.length >= SEARCH_THRESHOLD;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProjects = normalizedQuery
    ? projects.filter(
        (project) =>
          project.name.toLowerCase().includes(normalizedQuery) ||
          project.domain?.toLowerCase().includes(normalizedQuery),
      )
    : projects;

  // Keep the keyboard highlight visible while arrowing through a scrolled list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = (project: ProjectSummary) => {
    closeDropdown();
    setQuery("");
    setHighlightIndex(0);
    onCloseDrawer?.();
    if (project.id === activeProjectId) return;
    setLastProjectId(project.id);
    void navigate({
      to: "/p/$projectId/keywords",
      params: { projectId: project.id },
    });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlightIndex((index) =>
        Math.min(Math.max(index + delta, 0), filteredProjects.length - 1),
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const project = filteredProjects[highlightIndex] ?? filteredProjects[0];
      if (project) handleSelect(project);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  return (
    <div className={`dropdown ${isSidebar ? "w-full" : "dropdown-end"}`}>
      <button
        type="button"
        tabIndex={0}
        aria-label={intl.formatMessage({ id: "projectSwitcher.switch" })}
        className={
          isSidebar
            ? "btn btn-ghost btn-sm w-full justify-between font-medium"
            : "flex h-10 max-w-[12rem] items-center gap-2 rounded-full px-3 text-left transition-colors hover:bg-base-200/80"
        }
      >
        <span className="flex min-w-0 flex-col">
          <span
            className="truncate text-sm font-medium text-base-content"
            data-ph-mask
          >
            {activeProject?.name ??
              intl.formatMessage({ id: "projectSwitcher.select" })}
          </span>
          {activeProject?.domain ? (
            <span
              className="truncate text-xs font-normal text-base-content/50"
              data-ph-mask
            >
              {activeProject.domain}
            </span>
          ) : null}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-base-content/40" />
      </button>

      {/*
        The panel is a container, not the menu itself: the project list scrolls
        inside a capped region so a workspace with many projects can no longer
        push the "Manage projects" footer past the viewport edge. `flex-nowrap`
        because daisyUI menus wrap into extra columns by default.
      */}
      <div
        tabIndex={0}
        className={`dropdown-content z-30 flex flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-lg ${
          isSidebar ? "w-full" : "mt-2 w-64"
        }`}
      >
        {showSearch ? (
          <div className="border-b border-base-300 p-2">
            <label className="input input-bordered input-sm flex w-full items-center gap-2">
              <Search className="size-3.5 shrink-0 text-base-content/40" />
              <input
                type="text"
                value={query}
                placeholder={intl.formatMessage({
                  id: "projectSwitcher.searchPlaceholder",
                })}
                aria-label={intl.formatMessage({
                  id: "projectSwitcher.searchAria",
                })}
                aria-controls="project-switcher-listbox"
                aria-activedescendant={
                  filteredProjects[highlightIndex]
                    ? `project-option-${filteredProjects[highlightIndex].id}`
                    : undefined
                }
                className="grow min-w-0 bg-transparent outline-none"
                data-ph-mask
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
            </label>
          </div>
        ) : null}

        {projects.length > 0 ? (
          <ul
            ref={listRef}
            id="project-switcher-listbox"
            role="listbox"
            aria-label={intl.formatMessage({ id: "projectSwitcher.listAria" })}
            className="menu max-h-[min(60vh,21rem)] w-full flex-nowrap overflow-y-auto p-2"
          >
            {filteredProjects.map((project, index) => {
              const isActive = project.id === activeProjectId;
              const isHighlighted = showSearch && index === highlightIndex;
              return (
                <li key={project.id} role="presentation">
                  <button
                    type="button"
                    id={`project-option-${project.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-highlighted={isHighlighted || undefined}
                    onClick={() => handleSelect(project)}
                    onMouseEnter={
                      showSearch ? () => setHighlightIndex(index) : undefined
                    }
                    className={
                      isActive ? "active" : isHighlighted ? "bg-base-200" : ""
                    }
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate" data-ph-mask>
                        {project.name}
                      </span>
                      {project.domain ? (
                        <span
                          className="truncate text-xs text-base-content/50"
                          data-ph-mask
                        >
                          {project.domain}
                        </span>
                      ) : null}
                    </span>
                    {isActive ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
            {filteredProjects.length === 0 ? (
              <li className="menu-disabled">
                <span className="text-base-content/50">
                  {intl.formatMessage(
                    { id: "projectSwitcher.noMatches" },
                    { query: query.trim() },
                  )}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}

        <ul
          className={`menu w-full shrink-0 p-2 ${
            projects.length > 0 ? "border-t border-base-300" : ""
          }`}
        >
          <li>
            <Link
              to="/projects"
              onClick={() => {
                closeDropdown();
                onCloseDrawer?.();
              }}
            >
              <FolderCog className="size-4" />
              {intl.formatMessage({ id: "projectSwitcher.manage" })}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
