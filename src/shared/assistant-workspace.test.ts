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
});
