import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, ExternalLink, Loader2 } from "lucide-react";
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
        We could not open this private assistant workspace.
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
              AI workspace
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <Bot className="size-6 text-primary" aria-hidden="true" />
              Assisted SEO workflows
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              Private to you inside {project.data.name}.
            </p>
          </div>
          <Link to="/ai" className="btn btn-ghost min-h-11 sm:btn-sm">
            MCP setup <ExternalLink className="size-4" aria-hidden="true" />
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
              <h2 className="font-semibold">AI setup required</h2>
              <p className="text-sm text-base-content/70">
                {identity.data.unavailableReason}
              </p>
              <Link to="/ai" className="btn btn-primary min-h-11 w-fit">
                Open MCP and AI setup
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
