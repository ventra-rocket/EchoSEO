import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "sonner";
import { SearchConsoleConnectionCard } from "@/client/features/gsc/SearchConsoleConnectionCard";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import {
  clearLastProjectId,
  getLastProjectId,
} from "@/client/lib/active-project";
import {
  archiveProject,
  getProjects,
  updateProject,
} from "@/serverFunctions/projects";
import type { ProjectSummary } from "./types";

export function ProjectSettings({ projectId }: { projectId: string }) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  const project = projects.find((entry) => entry.id === projectId) ?? null;

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4 py-8 sm:p-6 md:py-12">
      <div className="space-y-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-base-content/60 transition-colors hover:text-base-content"
        >
          <ChevronLeft className="size-4" />
          <FormattedMessage id="projectsSettings.page.title" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <FormattedMessage id="projectsSettings.route.heading" />
          </h1>
          <p className="text-sm text-base-content/60">{project.name}</p>
        </div>
      </div>

      {/* key resets the form's local state when switching between projects */}
      <GeneralSection key={project.id} project={project} />

      <section id="search-console" className="space-y-3 scroll-mt-6">
        <h2 className="text-sm font-medium text-base-content/50">
          <FormattedMessage id="projectsSettings.section.searchConsole" />
        </h2>
        <SearchConsoleConnectionCard projectId={projectId} />
      </section>

      <DangerSection project={project} canArchive={projects.length > 1} />
    </div>
  );
}

function GeneralSection({ project }: { project: ProjectSummary }) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(project.name);
  const [domain, setDomain] = React.useState(project.domain ?? "");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProject({
        data: {
          projectId: project.id,
          name: name.trim(),
          domain: domain.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        intl.formatMessage({ id: "projectsSettings.general.updateSuccess" }),
      );
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "projectsSettings.general.updateError" }),
        ),
      ),
  });

  const isDirty =
    name.trim() !== project.name ||
    (domain.trim() || "") !== (project.domain ?? "");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (updateMutation.isPending) return;
    if (!name.trim()) {
      toast.error(
        intl.formatMessage({
          id: "projectsSettings.validation.nameRequired",
        }),
      );
      return;
    }
    updateMutation.mutate();
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-base-content/50">
        <FormattedMessage id="projectsSettings.section.general" />
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            <FormattedMessage id="projectsSettings.field.name" />
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            className="input input-bordered w-full"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            <FormattedMessage id="projectsSettings.field.domain" />{" "}
            <span className="text-base-content/50">
              <FormattedMessage id="projectsSettings.field.domainOptional" />
            </span>
          </span>
          <input
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder={intl.formatMessage({
              id: "projectsSettings.field.domainPlaceholder",
            })}
            maxLength={255}
            className="input input-bordered w-full"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={updateMutation.isPending || !isDirty}
          >
            <FormattedMessage id="projectsSettings.general.save" />
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerSection({
  project,
  canArchive,
}: {
  project: ProjectSummary;
  canArchive: boolean;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject({ data: { projectId: project.id } }),
    onSuccess: async () => {
      if (getLastProjectId() === project.id) clearLastProjectId();
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        intl.formatMessage({ id: "projectsSettings.danger.archiveSuccess" }),
      );
      // Re-resolve to a remaining project via the landing redirect.
      void navigate({ to: "/" });
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "projectsSettings.danger.archiveError" }),
        ),
      ),
  });

  return (
    <section className="space-y-3 border-t border-base-300 pt-8">
      <h2 className="text-sm font-medium text-base-content/50">
        <FormattedMessage id="projectsSettings.danger.title" />
      </h2>

      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-base-content/70">
            <FormattedMessage
              id="projectsSettings.danger.confirmBody"
              values={{
                name: project.name,
                b: (chunks) => (
                  <span className="font-medium text-base-content">
                    {chunks}
                  </span>
                ),
              }}
            />
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              <FormattedMessage id="projectsSettings.danger.confirmButton" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
              disabled={archiveMutation.isPending}
            >
              <FormattedMessage id="projectsSettings.action.cancel" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-base-content/60">
            <FormattedMessage
              id={
                canArchive
                  ? "projectsSettings.danger.canArchiveHint"
                  : "projectsSettings.danger.cannotArchiveHint"
              }
            />
          </p>
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm shrink-0"
            onClick={() => setConfirming(true)}
            disabled={!canArchive}
          >
            <FormattedMessage id="projectsSettings.danger.title" />
          </button>
        </div>
      )}
    </section>
  );
}
