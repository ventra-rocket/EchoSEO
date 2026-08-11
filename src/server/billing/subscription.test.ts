import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTUMN_MANAGED_ACCESS_FEATURE_ID,
  AUTUMN_PAID_PLAN_FEATURE_ID,
} from "@/shared/billing";

const {
  checkMock,
  getOrCreateMock,
  isAutumnConfiguredMock,
  getOptionalEnvValueMock,
  isHostedAccessOpenMock,
} = vi.hoisted(() => ({
  checkMock: vi.fn(),
  getOrCreateMock: vi.fn(),
  isAutumnConfiguredMock: vi.fn(),
  getOptionalEnvValueMock: vi.fn(),
  isHostedAccessOpenMock: vi.fn(),
}));

vi.mock("@/server/billing/autumn", () => ({
  autumn: {
    check: checkMock,
    customers: {
      getOrCreate: getOrCreateMock,
    },
  },
}));

// subscription.ts now imports isAutumnConfigured + getOptionalEnvValue from
// runtime-env (the degrade-on-absent guard and the allowlist reader); mock both
// or the imports resolve to undefined and every call throws.
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: vi.fn(),
  isAutumnConfigured: isAutumnConfiguredMock,
  getOptionalEnvValue: getOptionalEnvValueMock,
  isHostedAccessOpen: isHostedAccessOpenMock,
}));

// subscription.ts imports posthog (for trackUsageCreditSpend); stub it so the
// test doesn't pull in the cloudflare:workers runtime it depends on.
vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: vi.fn(),
}));

import {
  customerHasManagedAccess,
  customerHasPaidPlan,
  getOrCreateOrganizationCustomer,
  isOrgAllowlisted,
  orgMayUseManagedFeatures,
  orgMayUsePaidFeatures,
} from "./subscription";

describe("subscription billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to the configured, empty-allowlist world; individual tests
    // override to exercise the degrade / allowlist branches.
    isAutumnConfiguredMock.mockResolvedValue(true);
    getOptionalEnvValueMock.mockResolvedValue(undefined);
    // Closed by default so the allowlist and entitlement branches below are
    // actually reached — an open-access default would answer every policy
    // question `true` and quietly stop testing them.
    isHostedAccessOpenMock.mockResolvedValue(false);
  });

  it("checks the paid plan entitlement", async () => {
    checkMock.mockResolvedValue({ allowed: true });

    await expect(customerHasPaidPlan("org_123")).resolves.toBe(true);

    expect(checkMock).toHaveBeenCalledWith({
      customerId: "org_123",
      featureId: AUTUMN_PAID_PLAN_FEATURE_ID,
    });
  });

  it("returns false when org lacks paid plan", async () => {
    checkMock.mockResolvedValue({ allowed: false });

    await expect(customerHasPaidPlan("org_123")).resolves.toBe(false);
  });

  it("looks up the billing customer by organization id", async () => {
    getOrCreateMock.mockResolvedValue({ id: "cust_123" });

    await getOrCreateOrganizationCustomer({
      organizationId: "org_123",
      userId: "user_123",
      userEmail: "alice@example.com",
    });

    expect(getOrCreateMock).toHaveBeenCalledWith({
      customerId: "org_123",
      email: "alice@example.com",
    });
  });

  it("degrades to false without calling Autumn when it is not configured", async () => {
    isAutumnConfiguredMock.mockResolvedValue(false);

    await expect(customerHasPaidPlan("org_123")).resolves.toBe(false);
    await expect(customerHasManagedAccess("org_123")).resolves.toBe(false);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("propagates (never swallows to false) when Autumn is present but check throws", async () => {
    isAutumnConfiguredMock.mockResolvedValue(true);
    checkMock.mockRejectedValue(new Error("autumn outage"));

    // A present-but-broken key MUST surface loudly — a billing outage silently
    // returning false would 402 paying customers.
    await expect(customerHasPaidPlan("org_123")).rejects.toThrow(
      "autumn outage",
    );
  });

  it("isOrgAllowlisted is fail-closed on unset/blank env and drops empty entries", async () => {
    getOptionalEnvValueMock.mockResolvedValue(undefined);
    await expect(isOrgAllowlisted("org_123")).resolves.toBe(false);

    getOptionalEnvValueMock.mockResolvedValue("");
    await expect(isOrgAllowlisted("org_123")).resolves.toBe(false);

    getOptionalEnvValueMock.mockResolvedValue(" , ,org_123, ");
    await expect(isOrgAllowlisted("org_123")).resolves.toBe(true);
    // A blank org id must never match a stray blank entry.
    await expect(isOrgAllowlisted("")).resolves.toBe(false);
    // Pin the env key name so a refactor can't silently read the wrong var.
    expect(getOptionalEnvValueMock).toHaveBeenCalledWith(
      "CORE_ACCESS_ALLOWLIST",
    );
  });

  it("orgMayUsePaidFeatures grants an allowlisted org without touching Autumn", async () => {
    isAutumnConfiguredMock.mockResolvedValue(false);
    getOptionalEnvValueMock.mockResolvedValue("org_123, org_456");

    await expect(orgMayUsePaidFeatures("org_123")).resolves.toBe(true);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("orgMayUsePaidFeatures denies a non-allowlisted org when Autumn is absent (no throw)", async () => {
    isAutumnConfiguredMock.mockResolvedValue(false);
    getOptionalEnvValueMock.mockResolvedValue("org_999");

    await expect(orgMayUsePaidFeatures("org_123")).resolves.toBe(false);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("orgMayUseManagedFeatures delegates to the managed fact when not allowlisted and Autumn is present", async () => {
    isAutumnConfiguredMock.mockResolvedValue(true);
    getOptionalEnvValueMock.mockResolvedValue(undefined);
    checkMock.mockResolvedValue({ allowed: true });

    await expect(orgMayUseManagedFeatures("org_123")).resolves.toBe(true);
    expect(checkMock).toHaveBeenCalledWith({
      customerId: "org_123",
      featureId: AUTUMN_MANAGED_ACCESS_FEATURE_ID,
    });
  });

  // HOSTED_ACCESS_OPEN means "let people in while billing is deferred". It used
  // to be honoured at one call site out of four, so an org the flag was meant
  // to admit still met PAYMENT_REQUIRED — with no plan on sale to clear it.
  // Both policies are pinned because they gate different features and drifted
  // apart once already.
  it("admits any org for managed features while open access is on", async () => {
    isHostedAccessOpenMock.mockResolvedValue(true);
    getOptionalEnvValueMock.mockResolvedValue(undefined);

    await expect(orgMayUseManagedFeatures("org_stranger")).resolves.toBe(true);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("admits any org for paid features while open access is on", async () => {
    isHostedAccessOpenMock.mockResolvedValue(true);
    getOptionalEnvValueMock.mockResolvedValue(undefined);

    await expect(orgMayUsePaidFeatures("org_stranger")).resolves.toBe(true);
    expect(checkMock).not.toHaveBeenCalled();
  });

  // The flag opens ACCESS, not the wallet: spending still needs a provider
  // credential, which is a separate axis. If closing the flag ever stopped
  // restoring the paywall, the deployment could not be locked down again.
  it("restores the paywall for a stranger once open access is off", async () => {
    isHostedAccessOpenMock.mockResolvedValue(false);
    isAutumnConfiguredMock.mockResolvedValue(false);
    getOptionalEnvValueMock.mockResolvedValue(undefined);

    await expect(orgMayUseManagedFeatures("org_stranger")).resolves.toBe(false);
    await expect(orgMayUsePaidFeatures("org_stranger")).resolves.toBe(false);
  });
});
