import { describe, expect, it } from "vitest";
import { ON_PAGE_RULES } from "../rules/on-page";
import { makeGoodPage } from "./on-page-signals-fixture";

function ruleById(id: string) {
  const rule = ON_PAGE_RULES.find((entry) => entry.id === id);
  if (!rule) throw new Error(`missing rule ${id}`);
  return rule;
}

describe("ON_PAGE_RULES", () => {
  it("passes every rule against a fully-optimized page", () => {
    const page = makeGoodPage();
    for (const rule of ON_PAGE_RULES) {
      expect(rule.appliesWhen(page)).toBe("pass");
    }
  });

  describe("meta-title", () => {
    const rule = ruleById("meta-title");
    it("fails when the title is empty", () => {
      expect(rule.appliesWhen(makeGoodPage({ title: "" }))).toBe("fail");
    });
    it("warns when the title is too short", () => {
      expect(rule.appliesWhen(makeGoodPage({ title: "Short" }))).toBe("warn");
    });
    it("warns when the title is too long", () => {
      expect(rule.appliesWhen(makeGoodPage({ title: "x".repeat(61) }))).toBe(
        "warn",
      );
    });
  });

  describe("meta-description", () => {
    const rule = ruleById("meta-description");
    it("fails when the description is empty", () => {
      expect(rule.appliesWhen(makeGoodPage({ metaDescription: "" }))).toBe(
        "fail",
      );
    });
    it("warns when the description is out of range", () => {
      expect(
        rule.appliesWhen(makeGoodPage({ metaDescription: "too short" })),
      ).toBe("warn");
    });
  });

  describe("meta-canonical", () => {
    const rule = ruleById("meta-canonical");
    it("fails when no canonical link is present", () => {
      expect(rule.appliesWhen(makeGoodPage({ canonical: null }))).toBe("fail");
    });
  });

  describe("structure-h1", () => {
    const rule = ruleById("structure-h1");
    it("fails with zero H1s", () => {
      expect(rule.appliesWhen(makeGoodPage({ h1s: [] }))).toBe("fail");
    });
    it("warns with more than one H1", () => {
      expect(rule.appliesWhen(makeGoodPage({ h1s: ["One", "Two"] }))).toBe(
        "warn",
      );
    });
  });

  describe("structure-heading-order", () => {
    const rule = ruleById("structure-heading-order");
    it("warns when a heading level is skipped", () => {
      expect(rule.appliesWhen(makeGoodPage({ headingOrder: [1, 2, 4] }))).toBe(
        "warn",
      );
    });
    it("passes when levels increase by at most one", () => {
      expect(
        rule.appliesWhen(makeGoodPage({ headingOrder: [1, 2, 3, 2, 3] })),
      ).toBe("pass");
    });
  });

  describe("structure-image-alt", () => {
    const rule = ruleById("structure-image-alt");
    it("passes with no images", () => {
      expect(rule.appliesWhen(makeGoodPage({ images: [] }))).toBe("pass");
    });
    it("does not penalize a decorative image's valid empty alt attribute", () => {
      expect(
        rule.appliesWhen(
          makeGoodPage({
            images: [{ src: "https://good.test/x.png", alt: "" }],
          }),
        ),
      ).toBe("pass");
    });
    it("warns when some images are missing alt text", () => {
      expect(
        rule.appliesWhen(
          makeGoodPage({
            images: [
              { src: "https://good.test/a.png", alt: "a" },
              { src: "https://good.test/b.png", alt: null },
            ],
          }),
        ),
      ).toBe("warn");
    });
    it("fails when every image is missing alt text", () => {
      expect(
        rule.appliesWhen(
          makeGoodPage({
            images: [{ src: "https://good.test/a.png", alt: null }],
          }),
        ),
      ).toBe("fail");
    });
  });

  describe("structure-word-count", () => {
    const rule = ruleById("structure-word-count");
    it("fails under 300 words", () => {
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 50 }))).toBe("fail");
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 299 }))).toBe("fail");
    });
    it("warns between 300 and 599 words", () => {
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 300 }))).toBe("warn");
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 400 }))).toBe("warn");
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 599 }))).toBe("warn");
    });
    it("passes at 600 words and above", () => {
      expect(rule.appliesWhen(makeGoodPage({ wordCount: 600 }))).toBe("pass");
    });
    it("names the pass threshold (600) in both labels, never the warn floor", () => {
      // A label that promised "300+ words" beside a warn verdict at 560 words
      // read as the tool contradicting itself — the label must state the
      // recommendation the pass threshold actually implements.
      expect(rule.label).toContain("600");
      expect(rule.label).not.toContain("300");
      const vi = rule.locales?.vi;
      expect(vi?.label).toContain("600");
      expect(vi?.label).not.toContain("300");
    });
  });
});
