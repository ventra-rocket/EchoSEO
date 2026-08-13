import { beforeEach, describe, expect, it, vi } from "vitest";

const { isHostedServerAuthModeMock, isHostedAccessOpenMock } = vi.hoisted(
  () => ({
    isHostedServerAuthModeMock: vi.fn(),
    isHostedAccessOpenMock: vi.fn(),
  }),
);

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: isHostedServerAuthModeMock,
  isHostedAccessOpen: isHostedAccessOpenMock,
}));

const { hasUsableDataforseoCredentials, resolveDataforseoCredentialAccess } =
  await import("./credential-access-policy");

beforeEach(() => {
  vi.clearAllMocks();
  isHostedServerAuthModeMock.mockResolvedValue(true);
  isHostedAccessOpenMock.mockResolvedValue(false);
});

describe("resolveDataforseoCredentialAccess", () => {
  it("treats a missing key as unavailable without reading runtime policy", async () => {
    await expect(
      resolveDataforseoCredentialAccess({ apiKey: null, source: "none" }),
    ).resolves.toBe("unavailable");
    expect(isHostedServerAuthModeMock).not.toHaveBeenCalled();
  });

  it("always permits an organization-owned key without billing checks", async () => {
    isHostedAccessOpenMock.mockResolvedValue(true);

    await expect(
      resolveDataforseoCredentialAccess({ apiKey: "org-key", source: "org" }),
    ).resolves.toBe("byo");
    expect(isHostedServerAuthModeMock).not.toHaveBeenCalled();
    expect(isHostedAccessOpenMock).not.toHaveBeenCalled();
  });

  it("permits a global key directly in self-host mode", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(false);

    await expect(
      resolveDataforseoCredentialAccess({
        apiKey: "global-key",
        source: "global",
      }),
    ).resolves.toBe("global-self-host");
    expect(isHostedAccessOpenMock).not.toHaveBeenCalled();
  });

  it("meters a global key in hosted mode when open-access is off", async () => {
    await expect(
      resolveDataforseoCredentialAccess({
        apiKey: "global-key",
        source: "global",
      }),
    ).resolves.toBe("global-metered");
  });

  it("rejects a global key in hosted open-access mode", async () => {
    isHostedAccessOpenMock.mockResolvedValue(true);

    await expect(
      resolveDataforseoCredentialAccess({
        apiKey: "global-key",
        source: "global",
      }),
    ).resolves.toBe("unavailable");
  });

  it("reports UI readiness from the same credential policy", async () => {
    await expect(
      hasUsableDataforseoCredentials({
        hasOrganizationKey: false,
        globalApiKey: "global-key",
        runtime: { hosted: true, openAccess: true },
      }),
    ).resolves.toBe(false);
    await expect(
      hasUsableDataforseoCredentials({
        hasOrganizationKey: true,
        globalApiKey: "global-key",
        runtime: { hosted: true, openAccess: true },
      }),
    ).resolves.toBe(true);
    await expect(
      hasUsableDataforseoCredentials({
        hasOrganizationKey: false,
        globalApiKey: "global-key",
        runtime: { hosted: false, openAccess: true },
      }),
    ).resolves.toBe(true);
  });
});
