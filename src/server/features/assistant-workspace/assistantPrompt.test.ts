import { describe, expect, it } from "vitest";
import { chatLocaleSchema } from "@/shared/chat-locale";
import {
  ASSISTANT_GATES,
  assistantGateReply,
  buildSystemPrompt,
} from "./assistantPrompt";

describe("assistantGateReply", () => {
  it("answers every gate in both locales", () => {
    for (const gate of ASSISTANT_GATES) {
      expect(assistantGateReply(gate, "en").length).toBeGreaterThan(0);
      expect(assistantGateReply(gate, "vi").length).toBeGreaterThan(0);
    }
  });

  it("gives a Vietnamese reader Vietnamese, not the English string", () => {
    // The defect this pins: both sentences shipped English-only, returned
    // regardless of the reader's locale. A copy-paste of the English into `vi`
    // would pass a mere presence check, so require that the two differ and that
    // the Vietnamese carries diacritics.
    for (const gate of ASSISTANT_GATES) {
      const en = assistantGateReply(gate, "en");
      const vi = assistantGateReply(gate, "vi");
      expect(vi).not.toBe(en);
      expect(vi).toMatch(/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềể]/i);
    }
  });

  it("keeps the key name untranslated so the instruction stays runnable", () => {
    // Telling a self-hoster to set a translated environment variable would be
    // worse than telling them in English.
    expect(assistantGateReply("keyMissing", "vi")).toContain(
      "OPENROUTER_API_KEY",
    );
  });

  it("falls back to English for a locale the client did not send", () => {
    // The locale is client-supplied. Undefined, a typo or a hostile value must
    // degrade to English rather than throw inside the Durable Object.
    for (const raw of [undefined, "", "de", "en-US", 7, { locale: "vi" }]) {
      expect(
        assistantGateReply("hostedUnavailable", chatLocaleSchema.parse(raw)),
      ).toBe(assistantGateReply("hostedUnavailable", "en"));
    }
  });

  it("accepts the locale the client actually sends", () => {
    // react-intl's `intl.locale` is exactly "en" or "vi" here, so the happy
    // path must survive the same parse the hostile input goes through.
    expect(chatLocaleSchema.parse("vi")).toBe("vi");
  });
});

describe("buildSystemPrompt", () => {
  it("tells the model which language to answer in", () => {
    // The defect: the prompt carried no reply language at all, so the model
    // answered in English on a Vietnamese page - the same bug #111 fixed for
    // the onboarding agent, on a surface that was missed.
    expect(buildSystemPrompt("kello.ventrarocket.vn", "vi")).toContain(
      "Reply in Vietnamese",
    );
    expect(buildSystemPrompt("kello.ventrarocket.vn", "en")).toContain(
      "Reply in English",
    );
  });

  it("leads with the language, because a trailing instruction gets ignored", () => {
    // Measured in #118 against the production model: the instruction has to sit
    // at the top of the prompt, not after several paragraphs of role text.
    expect(buildSystemPrompt(null, "vi").indexOf("Reply in Vietnamese")).toBe(
      0,
    );
  });

  it("keeps SEO vocabulary in English in the Vietnamese instruction", () => {
    // A translated "backlink" or "impressions" would not match any EchoSEO
    // label the reader can click, nor anything they would search for.
    expect(buildSystemPrompt(null, "vi")).toContain(
      "Keep SEO, product and metric names in English",
    );
  });

  it("states the project domain, or asks for one, in both locales", () => {
    // The locale must not change what the model is allowed to assume: a missing
    // domain has to stay a missing domain.
    for (const locale of ["en", "vi"] as const) {
      expect(buildSystemPrompt("kello.ventrarocket.vn", locale)).toContain(
        "The current project domain is kello.ventrarocket.vn.",
      );
      expect(buildSystemPrompt(null, locale)).toContain(
        "This project has no configured domain yet",
      );
    }
  });

  it("keeps the read-only boundary in every locale", () => {
    // The assisted surface is read-only by product decision. A prompt that
    // dropped this line in one locale would be a product boundary that depends
    // on the reader's language.
    for (const locale of ["en", "vi"] as const) {
      const prompt = buildSystemPrompt("example.com", locale);
      expect(prompt).toContain("You cannot publish content");
      expect(prompt).toContain("Do not invent metrics");
    }
  });
});
