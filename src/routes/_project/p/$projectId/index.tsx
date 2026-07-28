import { createFileRoute } from "@tanstack/react-router";
import { ProjectCommandCenterPage } from "@/client/features/command-center/ProjectCommandCenterPage";

export const Route = createFileRoute("/_project/p/$projectId/")({
  component: ProjectCommandCenterRoute,
});

function ProjectCommandCenterRoute() {
  const { projectId } = Route.useParams();
  return <ProjectCommandCenterPage projectId={projectId} />;
}
