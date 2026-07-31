import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTurnstileErrorCodes, verifyTurnstileToken } from "./turnstile";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyTurnstileToken", () => {
  it("fails fast on an empty token without calling siteverify", async () => {
    const result = await verifyTurnstileToken("", "secret");

    expect(result).toEqual({
      success: false,
      errorCodes: ["missing-input-response"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns success on a valid token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const result = await verifyTurnstileToken("good-token", "secret");

    expect(result).toEqual({ success: true, errorCodes: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(init!.method).toBe("POST");
  });

  it("returns failure with error codes on a rejected token", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
        { status: 200 },
      ),
    );

    const result = await verifyTurnstileToken("bad-token", "secret");

    expect(result).toEqual({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
  });

  it("fails closed when siteverify itself is unavailable", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const result = await verifyTurnstileToken("token", "secret");

    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["siteverify-unavailable"]);
  });

  it("includes the remote IP when provided", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    await verifyTurnstileToken("token", "secret", "203.0.113.1");

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = init!.body;
    if (!(sentBody instanceof URLSearchParams)) {
      throw new Error("expected a URLSearchParams body");
    }
    expect(sentBody.get("remoteip")).toBe("203.0.113.1");
  });
});

describe("formatTurnstileErrorCodes", () => {
  it("joins the codes siteverify returned", () => {
    expect(formatTurnstileErrorCodes(["timeout-or-duplicate"])).toBe(
      "timeout-or-duplicate",
    );
    expect(
      formatTurnstileErrorCodes(["invalid-input-secret", "bad-request"]),
    ).toBe("invalid-input-secret,bad-request");
  });

  it("still emits a value when siteverify named no reason", () => {
    // The field has to be present either way: a metric line missing `codes`
    // reads as "nobody looked", which is the state this whole change exists to
    // end.
    expect(formatTurnstileErrorCodes([])).toBe("none");
  });

  it("strips anything that would break the bare k=v metric encoding", () => {
    // These strings come from an external API, and the encoder does no
    // escaping — a space or an `=` would silently forge extra fields in the
    // operator's log.
    expect(
      formatTurnstileErrorCodes(["bad request", "codes=injected extra=field"]),
    ).toBe("badrequest,codesinjectedextrafield");
  });

  it("caps a flood of codes rather than emitting an unbounded line", () => {
    expect(formatTurnstileErrorCodes(["a", "b", "c", "d", "e", "f", "g"])).toBe(
      "a,b,c,d,e",
    );
  });
});
