import { describe, expect, it } from "vitest";
import { getShellGateState } from "./shell-gate-state";

describe("getShellGateState", () => {
  const ready = {
    canRenderAuthenticatedContent: true,
    isAuthRedirecting: false,
    isSubscribeBlocking: false,
    isSubscribeRedirecting: false,
  };

  it("renders the shell once both gates are satisfied", () => {
    expect(getShellGateState(ready)).toBe("ready");
  });

  it("shows pending while the session is still resolving", () => {
    expect(
      getShellGateState({ ...ready, canRenderAuthenticatedContent: false }),
    ).toBe("pending");
  });

  it("shows pending while the managed-access lookup is still running", () => {
    expect(getShellGateState({ ...ready, isSubscribeBlocking: true })).toBe(
      "pending",
    );
  });

  it("paints nothing once the auth guard has committed to a redirect", () => {
    expect(
      getShellGateState({
        ...ready,
        canRenderAuthenticatedContent: false,
        isAuthRedirecting: true,
      }),
    ).toBe("redirecting");
  });

  it("paints nothing once the paywall bounce has committed", () => {
    expect(
      getShellGateState({
        ...ready,
        isSubscribeBlocking: true,
        isSubscribeRedirecting: true,
      }),
    ).toBe("redirecting");
  });
});
