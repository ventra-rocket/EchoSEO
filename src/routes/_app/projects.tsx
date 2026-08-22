import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "sonner";
import {
  getArchivedProjects,
  getProjects,
  restoreProject,
} from "@/serverFunctions/projects";
import { getSiteCards } from "@/serverFunctions/audit";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { getLastProjectId } from "@/client/lib/active-project";
import { CreateProjectModal } from "@/client/features/projects/CreateProjectModal";
import { GscImportModal } from "@/client/features/gsc/GscImportModal";
import { SiteCard } from "@/client/features/audit/cards/SiteCard";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  // Read after mount to keep SSR/first render stable.
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    setCurrentProjectId(getLastProjectId());
  }, []);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  // Its own query, not part of `getProjects`: the crawl summary is heavier than
  // the project list and the list must render before it arrives.
  const cardsQuery = useQuery({
    queryKey: ["siteCards"],
    queryFn: () => getSiteCards(),
  });

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Wraps: two buttons and the description do not fit one 390px row, and
            a `shrink-0` group there clipped "New project" off the viewport
            entirely rather than merely making it narrow. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <FormattedMessage id="projectsSettings.page.title" />
            </h1>
            <p className="mt-1 text-sm text-base-content/60">
              <FormattedMessage id="projectsSettings.page.subtitle" />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Ahrefs' own onboarding is this button. A user who has connected
                Google should not have to retype domains this app can already
                read from their verified properties. */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setImporting(true)}
            >
              <Download className="size-4" />
              <FormattedMessage id="gsc.import.title" />
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" />
              <FormattedMessage id="projectsSettings.newProject.action" />
            </button>
          </div>
        </div>

        {projectsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <SiteCard
                  projectId={project.id}
                  projectName={project.name}
                  domain={project.domain}
                  // A project with no audit target has no card row at all; the
                  // component renders the "run the first audit" state for it.
                  card={
                    cardsQuery.data?.find(
                      (entry) => entry.projectId === project.id,
                    ) ?? null
                  }
                  isCurrent={project.id === currentProjectId}
                />
              </li>
            ))}
          </ul>
        )}

        <ArchivedProjects />
      </div>

      {creating ? (
        <CreateProjectModal onClose={() => setCreating(false)} />
      ) : null}
      {importing ? (
        <GscImportModal onClose={() => setImporting(false)} />
      ) : null}
    </div>
  );
}

function ArchivedProjects() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["projects", "archived"],
    queryFn: () => getArchivedProjects(),
  });
  const archived = archivedQuery.data ?? [];

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) =>
      restoreProject({ data: { archivedProjectId: projectId } }),
    onSuccess: async () => {
      // Prefix match invalidates both the active and archived lists.
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        intl.formatMessage({ id: "projectsSettings.archived.restoreSuccess" }),
      );
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({
            id: "projectsSettings.archived.restoreError",
          }),
        ),
      ),
  });

  if (archived.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-base-content/50">
        <FormattedMessage id="projectsSettings.archived.heading" />
      </h2>
      <ul className="divide-y divide-base-300 overflow-hidden rounded-lg border border-base-300">
        {archived.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-base-content/70">
                {project.name}
              </span>
              <span className="truncate text-xs text-base-content/50">
                {project.domain ??
                  intl.formatMessage({
                    id: "projectsSettings.archived.noDomain",
                  })}
              </span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm shrink-0"
              onClick={() => restoreMutation.mutate(project.id)}
              disabled={restoreMutation.isPending}
            >
              <FormattedMessage id="projectsSettings.archived.restore" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
