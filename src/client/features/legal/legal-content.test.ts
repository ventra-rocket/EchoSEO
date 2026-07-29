import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_CONTACT_EMAIL } from "@/shared/legal";
import {
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
  type LegalDocument,
} from "./legal-content";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function allText(doc: LegalDocument): string {
  return doc.sections
    .flatMap((section) =>
      section.blocks.flatMap((block) => {
        switch (block.kind) {
          case "paragraph":
            return [block.text];
          case "list":
            return block.items;
          case "definitions":
            return block.entries.flatMap((entry) => [
              entry.term,
              entry.description,
            ]);
        }
      }),
    )
    .join("\n");
}

describe.each([
  ["Terms", TERMS_DOCUMENT],
  ["Privacy Policy", PRIVACY_DOCUMENT],
])("%s document", (_name, doc) => {
  it("has a title, a summary, and sections that all carry content", () => {
    // A legal page that ships with an empty section is worse than a missing one:
    // it reads as though the topic is covered when nothing was written.
    expect(doc.title.trim()).not.toBe("");
    expect(doc.summary.trim()).not.toBe("");
    expect(doc.sections.length).toBeGreaterThan(0);

    for (const section of doc.sections) {
      expect(section.heading.trim()).not.toBe("");
      expect(section.blocks.length).toBeGreaterThan(0);
      for (const block of section.blocks) {
        if (block.kind === "paragraph") expect(block.text.trim()).not.toBe("");
        if (block.kind === "list")
          expect(block.items.length).toBeGreaterThan(0);
        if (block.kind === "definitions")
          expect(block.entries.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives the reader a way to reach us", () => {
    // Both documents promise the reader can contact us — to end the agreement,
    // or to exercise a data right. Neither promise means anything without the
    // address actually appearing on the page.
    expect(allText(doc)).toContain(LEGAL_CONTACT_EMAIL);
  });
});

describe("Terms reflect the decisions actually made", () => {
  const text = allText(TERMS_DOCUMENT);

  it("states the service is currently free rather than implying a paid plan", () => {
    // No payment, renewal, or refund terms have been written, so the Terms must
    // not read as though something is being sold. If a paid plan is switched on,
    // this test should fail and force those terms to be written.
    expect(text).toContain("currently free");
    expect(text).toContain("do not take payment details");
  });

  it("scopes itself to the hosted service, not self-hosted copies", () => {
    // The software is MIT-licensed and meant to be self-hosted. Terms that
    // silently claimed to govern someone else's deployment would be wrong.
    expect(text).toContain("self-host");
  });
});

describe("Privacy Policy describes the deployment we actually run", () => {
  const text = allText(PRIVACY_DOCUMENT);

  it("names Search Console access as read-only", () => {
    // The connected grant is `webmasters.readonly`. Claiming anything broader
    // would overstate what the user is agreeing to.
    expect(text).toContain("read-only");
  });

  it("does not claim a third-party analytics processor receives data", () => {
    // No analytics key is configured on this deployment, so nothing is sent.
    // The policy says the capability exists but is switched off; it must never
    // drift into naming a processor that receives data it does not receive.
    expect(text).toContain("switched off");
  });
});

describe("the sign-up form links to this deployment's own legal pages", () => {
  it("uses relative paths, not a hard-coded production origin", () => {
    // The regression this whole change exists to fix. The links were absolute
    // URLs to echoseo.ventrarocket.vn, so on any other deployment they pointed
    // at our documents instead of that operator's — and they 404'd everywhere
    // until these pages existed.
    const source = readFileSync(
      join(REPO_ROOT, "src/routes/_auth.sign-up.tsx"),
      "utf8",
    );
    expect(source).not.toContain("https://echoseo.ventrarocket.vn/terms");
    expect(source).not.toContain("https://echoseo.ventrarocket.vn/privacy");
    expect(source).toContain("LEGAL_TERMS_PATH");
    expect(source).toContain("LEGAL_PRIVACY_PATH");
  });
});
