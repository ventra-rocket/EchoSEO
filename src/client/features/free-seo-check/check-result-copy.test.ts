import { describe, expect, it } from "vitest";
import {
  DEEP_DISABLED_MESSAGE,
  DEEP_QUOTA_BLOCKED_MESSAGE,
} from "@/server/services/seo-check/deep-failure-messages";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * The `/r/{id}` failed state maps the specific server failure strings
 * (kill-switch, quota) to localized text by exact-string key. If a server
 * message is reworded without updating the copy map, the page silently falls
 * back to the generic line and loses its actionable guidance — so pin the keys
 * to their real source (the server constants), not to a duplicated literal.
 */
describe("report-page failed-message mapping", () => {
  it.each([DEEP_DISABLED_MESSAGE, DEEP_QUOTA_BLOCKED_MESSAGE])(
    "maps the server failure message in both locales: %s",
    (message) => {
      const en = CHECK_RESULT_COPY.en.reportPage.failedMessages;
      const vi = CHECK_RESULT_COPY.vi.reportPage.failedMessages;

      // EN maps each specific message to itself, so the page reads byte-identical.
      expect(en[message]).toBe(message);
      // VI provides a real, different translation.
      expect((vi[message] ?? "").trim().length).toBeGreaterThan(0);
      expect(vi[message]).not.toBe(message);
    },
  );
});
