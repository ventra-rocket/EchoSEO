import { beforeEach, describe, expect, it, vi } from "vitest";

const { createDataforseoClientMock } = vi.hoisted(() => ({
  createDataforseoClientMock: vi.fn(),
}));

vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: createDataforseoClientMock,
}));

import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createSeoDataProvider } from "./index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSeoDataProvider", () => {
  it("resolves to the DataForSEO provider, constructed with the billing customer", () => {
    const provider = { serp: {} };
    createDataforseoClientMock.mockReturnValue(provider);
    const customer: BillingCustomerContext = {
      organizationId: "org-1",
      userEmail: "user@example.com",
      userId: "user-1",
    };

    const resolved = createSeoDataProvider(customer);

    expect(createDataforseoClientMock).toHaveBeenCalledWith(customer);
    expect(resolved).toBe(provider);
  });
});
