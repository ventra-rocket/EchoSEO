import { describe, expect, it } from "vitest";
import { CORE_WEB_VITALS_RULES } from "../rules/core-web-vitals";
import type { CoreWebVitalsSignals } from "../rules/core-web-vitals";

function ruleById(id: string) {
  const rule = CORE_WEB_VITALS_RULES.find((entry) => entry.id === id);
  if (!rule) throw new Error(`missing rule ${id}`);
  return rule;
}

const GOOD_SIGNALS: CoreWebVitalsSignals = {
  lcpMs: 2000,
  inpMs: 150,
  cls: 0.05,
  ttfbMs: 500,
};

describe("CORE_WEB_VITALS_RULES", () => {
  it("passes every rule against good metrics", () => {
    for (const rule of CORE_WEB_VITALS_RULES) {
      expect(rule.appliesWhen(GOOD_SIGNALS)).toBe("pass");
    }
  });

  describe("cwv-lcp", () => {
    const rule = ruleById("cwv-lcp");
    it("warns between 2.5s and 4s", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, lcpMs: 3000 })).toBe("warn");
    });
    it("fails over 4s", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, lcpMs: 4500 })).toBe("fail");
    });
  });

  describe("cwv-inp", () => {
    const rule = ruleById("cwv-inp");
    it("warns between 200ms and 500ms", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, inpMs: 300 })).toBe("warn");
    });
    it("fails over 500ms", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, inpMs: 600 })).toBe("fail");
    });
  });

  describe("cwv-cls", () => {
    const rule = ruleById("cwv-cls");
    it("warns between 0.1 and 0.25", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, cls: 0.2 })).toBe("warn");
    });
    it("fails over 0.25", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, cls: 0.4 })).toBe("fail");
    });
  });

  describe("cwv-ttfb", () => {
    const rule = ruleById("cwv-ttfb");
    it("warns between 0.8s and 1.8s", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, ttfbMs: 1000 })).toBe("warn");
    });
    it("fails over 1.8s", () => {
      expect(rule.appliesWhen({ ...GOOD_SIGNALS, ttfbMs: 2000 })).toBe("fail");
    });
  });
});
