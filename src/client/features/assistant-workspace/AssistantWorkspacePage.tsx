import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, ExternalLink, Loader2 } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getProjectAccess } from "@/serverFunctions/projects";
import { getAssistantWorkspaceIdentity } from "@/serverFunctions/assistant-workspace";
import { AssistantWorkspaceConversation } from "./AssistantWorkspaceConversation";

export function AssistantWorkspacePage({ projectId }: { projectId: string }) {
  const project = useQuery({
    queryKey: ["project-access", projectId],
    queryFn: () => getProjectAccess({ data: { projectId } }),
  });
  const identity = useQuery({
    queryKey: ["assistant-workspace-identity", projectId],
    queryFn: () => getAssistantWorkspaceIdentity({ data: { projectId } }),
  });
  if (project.isLoading || identity.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  if (project.isError || identity.isError || !project.data || !identity.data)
    return (
      <div className="alert alert-error mx-4 my-6" role="alert">
        <FormattedMessage id="aiWorkspace.workspace.unavailable" />
      </div>
    );
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8"
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
              <FormattedMessage id="nav.assistantWorkspace" />
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <Bot className="size-6 text-primary" aria-hidden="true" />
              <FormattedMessage id="aiWorkspace.workspace.title" />
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              <FormattedMessage
                id="aiWorkspace.workspace.privateTo"
                values={{ projectName: project.data.name }}
              />
            </p>
          </div>
          <Link to="/ai" className="btn btn-ghost min-h-11 sm:btn-sm">
            <FormattedMessage id="aiWorkspace.workspace.mcpSetupLink" />{" "}
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        </header>
        {identity.data.available ? (
          <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <AssistantWorkspaceConversation
              projectId={projectId}
              userId={identity.data.userId}
            />
          </section>
        ) : (
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-3">
              <h2 className="font-semibold">
                <FormattedMessage id="aiWorkspace.workspace.setupRequired.title" />
              </h2>
              <p className="text-sm text-base-content/70">
                <FormattedMessage
                  id={
                    isHostedClientAuthMode()
                      ? "aiWorkspace.workspace.setupRequired.hostedReason"
                      : "aiWorkspace.workspace.setupRequired.missingKeyReason"
                  }
                />
              </p>
              <Link to="/ai" className="btn btn-primary min-h-11 w-fit">
                <FormattedMessage id="aiWorkspace.workspace.setupRequired.openLink" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
