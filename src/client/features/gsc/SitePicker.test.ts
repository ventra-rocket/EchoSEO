import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import { GSC_FAILURE_COPY, SitePicker } from "./SitePicker";
import { en } from "@/client/i18n/messages/en";
import type { GscGrantFailureReason } from "@/shared/gsc";

// GSC_FAILURE_COPY carries a message id, not a sentence — react-intl resolves
// it at render, so SitePicker needs an IntlProvider around it the same way the
// real app does (mounted once in `src/routes/__root.tsx`).
function renderFailure(failure: GscGrantFailureReason): string {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale: "en", messages: en },
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
    ),
  );
}

describe("GSC_FAILURE_COPY", () => {
  it("offers a connect action, not a reconnect, when nothing was ever connected", () => {
    const { messageId, action } = GSC_FAILURE_COPY.not_connected;

    expect(action).toBe("connect");
    expect(en[messageId]).not.toMatch(/reconnect/i);
  });

  it("offers a retry and no reconnect for a transient provider failure", () => {
    // The 403-is-quota case lands here. Reconnecting cannot clear a rate limit,
    // so the copy must not send the user through Google's consent screen.
    const { messageId, action } = GSC_FAILURE_COPY.provider_error;

    expect(action).toBe("retry");
    expect(en[messageId]).toMatch(/try again/i);
    expect(en[messageId]).not.toMatch(/reconnect/i);
  });

  it("names the admin-policy possibility when consent is blocked", () => {
    const { messageId, action } = GSC_FAILURE_COPY.consent_blocked;

    expect(action).toBe("reconnect");
    expect(en[messageId]).toMatch(/admin/i);
  });

  it("keeps the expiry copy for a spent grant only", () => {
    expect(GSC_FAILURE_COPY.grant_expired).toEqual({
      messageId: "gsc.failure.grantExpired",
      action: "reconnect",
    });
    expect(en["gsc.failure.grantExpired"]).toBe(
      "Connection expired. Reconnect to continue.",
    );

    const expiryClaims = Object.values(GSC_FAILURE_COPY).filter((copy) =>
      /expired/i.test(en[copy.messageId]),
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
