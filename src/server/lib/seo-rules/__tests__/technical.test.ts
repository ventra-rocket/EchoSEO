import { describe, expect, it } from "vitest";
import { TECHNICAL_RULES } from "../rules/technical";
import { makeGoodPage } from "./on-page-signals-fixture";

function ruleById(id: string) {
  const rule = TECHNICAL_RULES.find((entry) => entry.id === id);
  if (!rule) throw new Error(`missing rule ${id}`);
  return rule;
}

describe("TECHNICAL_RULES", () => {
  it("passes every rule against a fully-healthy page", () => {
    const page = makeGoodPage();
    for (const rule of TECHNICAL_RULES) {
      expect(rule.appliesWhen(page)).toBe("pass");
    }
  });

  describe("server-https", () => {
    const rule = ruleById("server-https");
    it("fails a plain HTTP page", () => {
      expect(rule.appliesWhen(makeGoodPage({ url: "http://good.test/" }))).toBe(
        "fail",
      );
    });
  });

  describe("server-status", () => {
    const rule = ruleById("server-status");
    it("warns on a redirect status code", () => {
      expect(rule.appliesWhen(makeGoodPage({ statusCode: 301 }))).toBe("warn");
    });
    it("fails on a 4xx/5xx status code", () => {
      expect(rule.appliesWhen(makeGoodPage({ statusCode: 404 }))).toBe("fail");
    });
  });

  describe("server-indexable", () => {
    const rule = ruleById("server-indexable");
    it("fails when robots meta blocks indexing", () => {
      expect(
        rule.appliesWhen(makeGoodPage({ robotsMeta: "noindex, nofollow" })),
      ).toBe("fail");
    });
    it("is case-insensitive", () => {
      expect(rule.appliesWhen(makeGoodPage({ robotsMeta: "NOINDEX" }))).toBe(
        "fail",
      );
    });
  });

  describe("server-mixed-content", () => {
    const rule = ruleById("server-mixed-content");
    it("fails when mixed content is present", () => {
      expect(rule.appliesWhen(makeGoodPage({ hasMixedContent: true }))).toBe(
        "fail",
      );
    });
  });
});
