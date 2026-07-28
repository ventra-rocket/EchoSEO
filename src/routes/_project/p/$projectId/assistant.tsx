import { createFileRoute } from "@tanstack/react-router";
import { AssistantWorkspacePage } from "@/client/features/assistant-workspace/AssistantWorkspacePage";

export const Route = createFileRoute("/_project/p/$projectId/assistant")({
  component: AssistantWorkspaceRoute,
});

function AssistantWorkspaceRoute() {
  const { projectId } = Route.useParams();
  return <AssistantWorkspacePage projectId={projectId} />;
}
