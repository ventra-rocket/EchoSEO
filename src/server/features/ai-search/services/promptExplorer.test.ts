import { describe, expect, it, vi } from "vitest";
import type { LlmResponseResult } from "@/server/lib/dataforseoLlmSchemas";

vi.mock("cloudflare:workers", () => ({ env: {}, waitUntil: vi.fn() }));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: vi.fn(() => ({})),
}));
vi.mock("@/server/lib/r2-cache", () => ({
  buildCacheKey: vi.fn(),
  getCached: vi.fn(),
  setCached: vi.fn(),
}));

import { extractCitations } from "./promptExplorer";

// DataForSEO's LLM Responses payload nests references as untyped
// `{ title, url }` objects under items[].sections[].annotations — mirroring the
// SDK's AnnotationInfo, which carries no citation-type discriminator. Filtering
// on `annotation.type === "citation"` therefore dropped every citation and the
// "Cited sources" block never rendered.
function response(
  annotations: Array<{ title?: string; url?: string }>,
): LlmResponseResult {
  return {
    model_name: "gpt-5",
    web_search: true,
    items: [
      {
        type: "reasoning",
        sections: [{ type: "summary_text", text: "thinking" }],
      },
      {
        type: "message",
        sections: [{ type: "text", text: "answer", annotations }],
      },
    ],
  };
}

describe("extractCitations", () => {
  it("keeps untyped annotations (no citation-type discriminator exists)", () => {
    const citations = extractCitations(
      response([
        { title: "Town & Country", url: "https://www.townandcountrymag.com/x" },
        { title: "Stylevana", url: "https://www.stylevana.com/y" },
      ]),
    );
    expect(citations.map((c) => c.url)).toEqual([
      "https://www.townandcountrymag.com/x",
      "https://www.stylevana.com/y",
    ]);
    expect(citations[0]?.domain).toBe("townandcountrymag.com");
    expect(citations[0]?.title).toBe("Town & Country");
  });

  it("dedupes repeated URLs and drops unsafe schemes", () => {
    const citations = extractCitations(
      response([
        { title: "A", url: "https://example.com/a" },
        { title: "A dup", url: "https://example.com/a" },
        { title: "evil", url: "javascript:alert(1)" },
        { title: "no url" },
      ]),
    );
    expect(citations).toHaveLength(1);
    expect(citations[0]?.url).toBe("https://example.com/a");
  });

  it("ignores annotations outside message items and returns [] when absent", () => {
    expect(extractCitations({ items: [] })).toEqual([]);
    expect(
      extractCitations({
        items: [
          {
            type: "reasoning",
            sections: [
              {
                type: "summary_text",
                text: "t",
                annotations: [{ title: "x", url: "https://x.test/1" }],
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("caps the list at 25 citations", () => {
    const citations = extractCitations(
      response(
        Array.from({ length: 40 }, (_, index) => ({
          title: `Source ${index}`,
          url: `https://example.com/${index}`,
        })),
      ),
    );
    expect(citations).toHaveLength(25);
  });
});
