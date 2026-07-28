export function createAssistantWorkspaceName(
  projectId: string,
  userId: string,
) {
  return `${projectId}:${userId}`;
}

export function parseAssistantWorkspaceName(name: string) {
  const separator = name.lastIndexOf(":");
  if (separator <= 0 || separator === name.length - 1) return null;
  return {
    projectId: name.slice(0, separator),
    userId: name.slice(separator + 1),
  };
}
