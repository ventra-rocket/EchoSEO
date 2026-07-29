import { describe, expect, it } from "vitest";
import { handleFreeSeoCheckPublicConfigRequest } from "./public-config";

describe("handleFreeSeoCheckPublicConfigRequest", () => {
  it("returns only the public Turnstile site key", async () => {
    const response = handleFreeSeoCheckPublicConfigRequest(
      new Request("https://echoseo.test/api/free-seo-check/config"),
      { TURNSTILE_SITE_KEY: "public-site-key" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      turnstileSiteKey: "public-site-key",
    });
  });

  it("rejects methods other than GET", () => {
    const response = handleFreeSeoCheckPublicConfigRequest(
      new Request("https://echoseo.test/api/free-seo-check/config", {
        method: "POST",
      }),
      {},
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
