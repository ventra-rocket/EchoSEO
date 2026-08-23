import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ToolExtra } from "@/server/mcp/context";
import { vi } from "vitest";
import { MCP_AUTH_CONTEXT_PROP } from "@/server/mcp/context";

// Mock scaffolding shared by the two Site Audit MCP tool suites:
// `site-audit-tools.access.test.ts` (who is allowed to reach audit data, and at
// what crawl size) and `site-audit-tools.output.test.ts` (what the tools then
// tell the agent). It lives here rather than being copied into both so the two
// suites can never drift into testing different fakes of the same services.
//
// The module under test is imported with `await import()` in each case, as every
// other MCP tool test here does: `resetAuditToolMocks()` runs `vi.resetModules()`
// per test so the tool module is re-evaluated against that test's mock return
// values, which a static import (evaluated once, before any mock is configured)
// cannot do.
//
// `vi.mock` factories are only invoked when the mocked module is first
// imported, so this table does not need `vi.hoisted` — and could not use it, as
// hoisted values cannot be exported. Every `vi.mock` call below is registered
// while this module is evaluated, which is before any test body reaches its
// dynamic import of the module under test.
export const mocks = {
  getProjectForOrganization: vi.fn(),
  startAudit: vi.fn(),
  getStatus: vi.fn(),
  getCrawlProgress: vi.fn(),
  getCommandCenterAudits: vi.fn(),
  listAuditPages: vi.fn(),
  getIssueSummary: vi.fn(),
  listIssueOccurrences: vi.fn(),
  orgMayUseManagedFeatures: vi.fn(),
  getServerAuthMode: vi.fn(),
};

vi.mock("cloudflare:workers", () => ({ env: {} }));

vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: {
    getProjectForOrganization: mocks.getProjectForOrganization,
  },
}));

vi.mock("@/server/features/audit/services/AuditService", () => ({
  AuditService: {
    startAudit: mocks.startAudit,
    getStatus: mocks.getStatus,
    getCrawlProgress: mocks.getCrawlProgress,
    getCommandCenterAudits: mocks.getCommandCenterAudits,
  },
}));

vi.mock("@/server/features/audit/services/audit-page-listing", () => ({
  listAuditPages: mocks.listAuditPages,
}));

vi.mock("@/server/features/audit/services/AuditIssueService", () => ({
  AuditIssueService: {
    getIssueSummary: mocks.getIssueSummary,
    listIssueOccurrences: mocks.listIssueOccurrences,
  },
}));

vi.mock("@/server/billing/subscription", () => ({
  orgMayUseManagedFeatures: mocks.orgMayUseManagedFeatures,
}));

// `isHostedServerAuthMode` is stubbed alongside the mode accessor because
// project-auth's revocation gate reads it, and letting it answer true there
// would pull in the database binding these tests never have.
vi.mock("@/server/lib/runtime-env", () => ({
  getServerAuthMode: mocks.getServerAuthMode,
  isHostedServerAuthMode: () => Promise.resolve(false),
}));

const authContext = {
  userId: "user_123",
  userEmail: "alice@example.com",
  organizationId: "org_123",
  clientId: "client_123",
  scopes: ["mcp"],
  audience: "https://echo-seo.test/mcp",
  subject: "user_123",
  baseUrl: "https://echo-seo.test",
};

export const toolExtra: ToolExtra = {
  signal: new AbortController().signal,
  requestId: 1,
  sendNotification: vi.fn(),
  sendRequest: vi.fn(),
  authInfo: {
    token: "token",
    clientId: "client_123",
    scopes: ["mcp"],
    resource: new URL("https://echo-seo.test/mcp"),
    extra: { [MCP_AUTH_CONTEXT_PROP]: authContext },
  } satisfies AuthInfo,
};

export function text(result: {
  content?: Array<{ type: string; text?: string }>;
}) {
  const first = result.content?.[0];
  return first?.type === "text" ? (first.text ?? "") : "";
}

/**
 * Per-test reset: a fresh module registry plus the happy-path defaults every
 * case starts from — the caller owns the project, the deployment is hosted, the
 * org has managed access, and an audit already exists to resolve ids against.
 */
export function resetAuditToolMocks() {
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getProjectForOrganization.mockResolvedValue({ id: "project_1" });
  mocks.getServerAuthMode.mockResolvedValue("hosted");
  mocks.orgMayUseManagedFeatures.mockResolvedValue(true);
  mocks.getCommandCenterAudits.mockResolvedValue({
    latest: { id: "audit_1" },
    latestCompleted: { id: "audit_1" },
  });
}
