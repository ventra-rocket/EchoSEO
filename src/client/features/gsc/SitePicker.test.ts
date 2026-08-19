import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GSC_FAILURE_COPY, SitePicker } from "./SitePicker";
import type { GscGrantFailureReason } from "@/shared/gsc";

function renderFailure(failure: GscGrantFailureReason): string {
  return renderToStaticMarkup(
    createElement(SitePicker, {
      loading: false,
      failure,
      sites: [],
      selectedSiteUrl: "",
      onSelect: () => {},
      onSave: () => {},
      saving: false,
      onConnect: () => {},
      onRetry: () => {},
    }),
  );
}

describe("GSC_FAILURE_COPY", () => {
  it("offers a connect action, not a reconnect, when nothing was ever connected", () => {
    const { message, action } = GSC_FAILURE_COPY.not_connected;

    expect(action).toBe("connect");
    expect(message).not.toMatch(/reconnect/i);
  });

  it("offers a retry and no reconnect for a transient provider failure", () => {
    // The 403-is-quota case lands here. Reconnecting cannot clear a rate limit,
    // so the copy must not send the user through Google's consent screen.
    const { message, action } = GSC_FAILURE_COPY.provider_error;

    expect(action).toBe("retry");
    expect(message).toMatch(/try again/i);
    expect(message).not.toMatch(/reconnect/i);
  });

  it("names the admin-policy possibility when consent is blocked", () => {
    const { message, action } = GSC_FAILURE_COPY.consent_blocked;

    expect(action).toBe("reconnect");
    expect(message).toMatch(/admin/i);
  });

  it("keeps the expiry copy for a spent grant only", () => {
    expect(GSC_FAILURE_COPY.grant_expired).toEqual({
      message: "Connection expired. Reconnect to continue.",
      action: "reconnect",
    });

    const expiryClaims = Object.values(GSC_FAILURE_COPY).filter((copy) =>
      /expired/i.test(copy.message),
    );
    expect(expiryClaims).toHaveLength(1);
  });
});

describe("SitePicker failure states", () => {
  it("renders a distinct message and action per failure class", () => {
    const rendered = {
      not_connected: renderFailure("not_connected"),
      consent_blocked: renderFailure("consent_blocked"),
      grant_expired: renderFailure("grant_expired"),
      provider_error: renderFailure("provider_error"),
    };

    expect(new Set(Object.values(rendered)).size).toBe(4);
    expect(rendered.not_connected).toContain("Connect with Google");
    expect(rendered.consent_blocked).toContain("Reconnect with Google");
    expect(rendered.grant_expired).toContain("Reconnect with Google");
    expect(rendered.provider_error).toContain("Try again");
    // The defect this replaces: every class rendered the expiry line.
    expect(rendered.not_connected).not.toContain("Connection expired");
    expect(rendered.consent_blocked).not.toContain("Connection expired");
    expect(rendered.provider_error).not.toContain("Connection expired");
    expect(rendered.provider_error).not.toContain("Reconnect");
  });
});
