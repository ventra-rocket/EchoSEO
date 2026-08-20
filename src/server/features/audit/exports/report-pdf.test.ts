import { beforeEach, describe, expect, it, vi } from "vitest";

const launchMock = vi.hoisted(() => vi.fn());

vi.mock("@cloudflare/puppeteer", () => ({ launch: launchMock }));
vi.mock("cloudflare:workers", () => ({ env: { BROWSER: {} } }));

const { renderReportArtifact } = await import("./report-pdf");

function browserThatFailsAt(stage: "setContent" | "pdf") {
  const close = vi.fn(async () => {});
  const boom = new Error(`${stage} exploded`);
  launchMock.mockResolvedValue({
    close,
    newPage: async () => ({
      setContent:
        stage === "setContent"
          ? async () => {
              throw boom;
            }
          : async () => {},
      pdf: async () => {
        throw boom;
      },
    }),
  });
  return { close, boom };
}

beforeEach(() => {
  launchMock.mockReset();
});

describe("renderReportArtifact", () => {
  it("closes the browser when the page throws mid-render", async () => {
    // A leaked session holds a slot in the account's concurrency budget until it
    // times out, and the symptom is a *later*, unrelated export failing to
    // launch — so the cleanup cannot be conditional on the render succeeding.
    const { close, boom } = browserThatFailsAt("pdf");

    await expect(
      renderReportArtifact({ format: "pdf", html: "<p>x</p>" }),
    ).rejects.toThrow(boom);
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes the browser when setting the content throws", async () => {
    const { close } = browserThatFailsAt("setContent");

    await expect(
      renderReportArtifact({ format: "pdf", html: "<p>x</p>" }),
    ).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns the rendered bytes and closes on the happy path", async () => {
    const close = vi.fn(async () => {});
    launchMock.mockResolvedValue({
      close,
      newPage: async () => ({
        setContent: async () => {},
        pdf: async () => new Uint8Array([37, 80, 68, 70]),
      }),
    });

    const result = await renderReportArtifact({
      format: "pdf",
      html: "<p>x</p>",
    });

    // "%PDF" — the bytes are passed through, not re-encoded.
    expect([...result.bytes]).toEqual([37, 80, 68, 70]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("never launches a browser for the editable copy", async () => {
    // The `.doc` output is the same HTML, so spending a Browser Rendering
    // session on it would burn quota for nothing.
    const result = await renderReportArtifact({
      format: "doc",
      html: "<p>Tiếng Việt</p>",
    });

    expect(launchMock).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(result.bytes)).toBe("<p>Tiếng Việt</p>");
  });
});
