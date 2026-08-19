import { afterEach, describe, expect, it, vi } from "vitest";
import { getProjectNavGroups } from "./items";

function segments(projectId: string) {
  return getProjectNavGroups(projectId).flatMap((entry) =>
    entry.type === "group"
      ? entry.items.map((item) => item.to)
      : [entry.item.to],
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getProjectNavGroups", () => {
  it("lists the assistant workspace when the deployment can serve it", () => {
    vi.stubEnv("AUTH_MODE", "cloudflare_access");

    expect(segments("p1")).toContain("/p/$projectId/assistant");
  });

  it("omits the assistant workspace in hosted mode", () => {
    // Hosted deployments return `available: false` from
    // `getAssistantWorkspaceIdentity`, so a nav entry there leads only to a
    // refusal. Everything else must stay, including the MCP setup link.
    vi.stubEnv("AUTH_MODE", "hosted");

    const items = segments("p1");

    expect(items).not.toContain("/p/$projectId/assistant");
    expect(items).toContain("/ai");
    expect(items).toContain("/p/$projectId/audit");
    expect(items).toContain("/p/$projectId/search-performance");
  });

  it("keeps every non-assistant destination identical across modes", () => {
    vi.stubEnv("AUTH_MODE", "hosted");
    const hosted = segments("p1");
    vi.stubEnv("AUTH_MODE", "local_noauth");
    const selfHost = segments("p1");

    expect(selfHost.filter((to) => to !== "/p/$projectId/assistant")).toEqual(
      hosted,
    );
  });
});
