import { describe, expect, it, vi } from "vitest";

// onboardingModel.ts imports getOnboardingAnswers, which reaches @/db and its
// cloudflare:workers binding — unloadable outside a Worker. Nothing here calls
// it; the mock only lets the module (and the *_OPTION_LABELS it defines) load
// under vitest's plain Node environment.
vi.mock("@/serverFunctions/onboarding", () => ({
  getOnboardingAnswers: vi.fn(),
}));

import { en, type MessageId } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import {
  CLIENT_WEBSITE_COUNT_OPTION_LABELS,
  CLIENT_WEBSITE_COUNT_OPTIONS,
  CLIENT_WORK_FOR,
  INTEREST_OPTION_LABELS,
  INTEREST_OPTIONS,
  SOURCE_OPTION_LABELS,
  SOURCE_OPTIONS,
  WORK_FOR_OPTION_LABELS,
  WORK_FOR_OPTIONS,
} from "./onboardingModel";

/**
 * The DB (onboarding_interested_features/work_for/client_website_count/
 * found_via) only ever receives the option strings themselves. This is the
 * contract that keeps a row saved before this change rendering correctly:
 * every value has a label id, that id is never the stored value itself, and
 * the id resolves to a real string in both catalogs.
 */
function checkLabelSet<T extends string>(
  options: readonly T[],
  labels: Record<T, MessageId>,
) {
  expect(Object.keys(labels).toSorted()).toEqual([...options].toSorted());
  for (const value of options) {
    const id = labels[value];
    expect(id).not.toBe(value);
    expect(id.startsWith("onboarding.option.")).toBe(true);
    expect(en).toHaveProperty(id);
    expect(viMessages).toHaveProperty(id);
  }
}

const LABEL_SET_CHECKS: [name: string, run: () => void][] = [
  [
    "INTEREST_OPTIONS",
    () => checkLabelSet(INTEREST_OPTIONS, INTEREST_OPTION_LABELS),
  ],
  [
    "WORK_FOR_OPTIONS",
    () => checkLabelSet(WORK_FOR_OPTIONS, WORK_FOR_OPTION_LABELS),
  ],
  [
    "CLIENT_WEBSITE_COUNT_OPTIONS",
    () =>
      checkLabelSet(
        CLIENT_WEBSITE_COUNT_OPTIONS,
        CLIENT_WEBSITE_COUNT_OPTION_LABELS,
      ),
  ],
  ["SOURCE_OPTIONS", () => checkLabelSet(SOURCE_OPTIONS, SOURCE_OPTION_LABELS)],
];

describe("onboarding option label lookups", () => {
  it.each(LABEL_SET_CHECKS)(
    "maps every %s value to a message id defined in both en and vi",
    (_name, run) => run(),
  );

  it("keeps CLIENT_WORK_FOR as the literal stored value WORK_FOR_OPTIONS and buildOnboardingPayload compare against", () => {
    expect(CLIENT_WORK_FOR).toBe("My clients");
    expect(WORK_FOR_OPTIONS).toContain(CLIENT_WORK_FOR);
    expect(WORK_FOR_OPTION_LABELS[CLIENT_WORK_FOR]).toBe(
      "onboarding.option.clients",
    );
    expect(en["onboarding.option.clients"]).toBe("My clients");
    expect(viMessages["onboarding.option.clients"]).toBe("Khách hàng của tôi");
  });

  it('resolves "Other" to one shared id everywhere it appears, not a re-spelled duplicate', () => {
    expect(INTEREST_OPTION_LABELS.Other).toBe("onboarding.option.other");
    expect(WORK_FOR_OPTION_LABELS.Other).toBe("onboarding.option.other");
    expect(SOURCE_OPTION_LABELS.Other).toBe("onboarding.option.other");
    expect(en["onboarding.option.other"]).toBe("Other");
    expect(viMessages["onboarding.option.other"]).toBe("Khác");
  });
});
