import { describe, expect, it } from "vitest";
import {
  createAssistantWorkspaceName,
  parseAssistantWorkspaceName,
} from "./assistant-workspace";

describe("assistant workspace identity", () => {
  it("keeps a conversation private to both a project and user", () => {
    expect(
      parseAssistantWorkspaceName(
        createAssistantWorkspaceName("project-1", "user-1"),
      ),
    ).toEqual({ projectId: "project-1", userId: "user-1" });
  });

  it("rejects incomplete durable object names", () => {
    expect(parseAssistantWorkspaceName("project-1")).toBeNull();
    expect(parseAssistantWorkspaceName(":user-1")).toBeNull();
    expect(parseAssistantWorkspaceName("project-1:")).toBeNull();
  });

  // The Worker gate (authorizeAssistantWorkspace in src/server.ts) authorizes a
  // durable-object connection purely from what this parser reports, then
  // demands `context.userId === identity.userId`. A crafted name must therefore
  // never attribute the trailing segment to anyone but the caller.
  it("attributes a padded name to the trailing segment only", () => {
    // "victim smuggled into the middle" — the caller still has to own the LAST
    // segment, and the leading remainder is then checked as a project id, which
    // will not resolve.
    expect(parseAssistantWorkspaceName("project-1:victim:attacker")).toEqual({
      projectId: "project-1:victim",
      userId: "attacker",
    });
  });

  it("round-trips ids that themselves contain a colon", () => {
    expect(
      parseAssistantWorkspaceName(
        createAssistantWorkspaceName("tenant:project-1", "user-1"),
      ),
    ).toEqual({ projectId: "tenant:project-1", userId: "user-1" });
  });
});
