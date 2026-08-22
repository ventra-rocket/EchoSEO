import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "sonner";
import { Modal } from "@/client/components/Modal";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { setLastProjectId } from "@/client/lib/active-project";
import { createProject } from "@/serverFunctions/projects";

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [domain, setDomain] = React.useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createProject({
        data: { name: name.trim(), domain: domain.trim() || undefined },
      }),
    onSuccess: async (created) => {
      setLastProjectId(created.id);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      toast.success(
        intl.formatMessage({ id: "projectsSettings.createProject.success" }),
      );
      // Land on the new project's settings so they can connect Search Console
      // and finish setting up the workspace.
      void navigate({
        to: "/p/$projectId/settings",
        params: { projectId: created.id },
      });
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "projectsSettings.createProject.error" }),
        ),
      ),
  });

  const isPending = createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    if (!name.trim()) {
      toast.error(
        intl.formatMessage({
          id: "projectsSettings.validation.nameRequired",
        }),
      );
      return;
    }
    createMutation.mutate();
  };

  return (
    <Modal
      maxWidth="max-w-md"
      onClose={isPending ? undefined : onClose}
      labelledBy="create-project-title"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 id="create-project-title" className="text-lg font-semibold">
          <FormattedMessage id="projectsSettings.newProject.action" />
        </h2>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            <FormattedMessage id="projectsSettings.field.name" />
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={intl.formatMessage({
              id: "projectsSettings.field.namePlaceholder",
            })}
            maxLength={120}
            autoFocus
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
          <span className="text-xs text-base-content/50">
            <FormattedMessage id="projectsSettings.createProject.hint" />
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isPending}
          >
            <FormattedMessage id="projectsSettings.action.cancel" />
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            <FormattedMessage id="projectsSettings.createProject.submit" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
