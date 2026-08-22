import { queryOptions } from "@tanstack/react-query";
import { getOnboardingAnswers } from "@/serverFunctions/onboarding";
import type { MessageId } from "@/client/i18n/messages";

export const ONBOARDING_LAST_STEP = 4;

export const INTEREST_OPTIONS = [
  "AI workflows with Claude or Codex (MCP)",
  "Keyword research",
  "Competitor research",
  "Backlink analysis",
  "Site audits",
  "Rank tracking",
  "Other",
] as const;

/**
 * Canonical option value -> message id for its on-screen label. Every array
 * above stays the exact string persisted to `user_onboarding_answers`
 * (`interested_features`, `work_for`, `client_website_count`, `found_via`) —
 * never a translated string — so rows saved before this change still render:
 * look the stored value up in the matching `*_OPTION_LABELS` record below to
 * get its current-locale label. "Other" resolves to one shared id across
 * every list it appears in — same fact, not three different translations.
 */
export const INTEREST_OPTION_LABELS: Record<
  (typeof INTEREST_OPTIONS)[number],
  MessageId
> = {
  "AI workflows with Claude or Codex (MCP)": "onboarding.option.aiWorkflows",
  "Keyword research": "onboarding.option.keywordResearch",
  "Competitor research": "onboarding.option.competitorResearch",
  "Backlink analysis": "onboarding.option.backlinkAnalysis",
  "Site audits": "onboarding.option.siteAudits",
  "Rank tracking": "onboarding.option.rankTracking",
  Other: "onboarding.option.other",
};

export const WORK_FOR_OPTIONS = [
  "My own startup or business",
  "My clients",
  "My employer's website",
  "My own side project",
  "I'm exploring before choosing a project",
  "Other",
] as const;

export const CLIENT_WORK_FOR = "My clients";

/** See INTEREST_OPTION_LABELS above. */
export const WORK_FOR_OPTION_LABELS: Record<
  (typeof WORK_FOR_OPTIONS)[number],
  MessageId
> = {
  "My own startup or business": "onboarding.option.ownBusiness",
  "My clients": "onboarding.option.clients",
  "My employer's website": "onboarding.option.employer",
  "My own side project": "onboarding.option.sideProject",
  "I'm exploring before choosing a project": "onboarding.option.exploring",
  Other: "onboarding.option.other",
};

export const CLIENT_WEBSITE_COUNT_OPTIONS = [
  "1–3",
  "4–10",
  "11–25",
  "25+",
] as const;

/**
 * See INTEREST_OPTION_LABELS above. The ranges themselves carry no words to
 * translate, matching the shipped rank.charts.band.top4to10 precedent.
 */
export const CLIENT_WEBSITE_COUNT_OPTION_LABELS: Record<
  (typeof CLIENT_WEBSITE_COUNT_OPTIONS)[number],
  MessageId
> = {
  "1–3": "onboarding.option.websiteCount1to3",
  "4–10": "onboarding.option.websiteCount4to10",
  "11–25": "onboarding.option.websiteCount11to25",
  "25+": "onboarding.option.websiteCount25plus",
};

export const SOURCE_OPTIONS = [
  "Google",
  "Reddit",
  "X / Twitter",
  "GitHub",
  "ChatGPT",
  "Claude",
  "Friend or colleague",
  "Other",
] as const;

/** See INTEREST_OPTION_LABELS above. */
export const SOURCE_OPTION_LABELS: Record<
  (typeof SOURCE_OPTIONS)[number],
  MessageId
> = {
  Google: "onboarding.option.sourceGoogle",
  Reddit: "onboarding.option.sourceReddit",
  "X / Twitter": "onboarding.option.sourceTwitter",
  GitHub: "onboarding.option.sourceGithub",
  ChatGPT: "onboarding.option.sourceChatgpt",
  Claude: "onboarding.option.sourceClaude",
  "Friend or colleague": "onboarding.option.sourceFriend",
  Other: "onboarding.option.other",
};

/** In-progress form state. Step is tracked separately in the URL. */
export type OnboardingAnswers = {
  selectedInterests: string[];
  interestOther: string;
  workFor: string;
  workForOther: string;
  clientWebsiteCount: string;
  source: string;
  sourceOther: string;
};

/** Answers as persisted in the DB (read back via getOnboardingAnswers). */
type SavedOnboardingAnswers = {
  interestedFeatures: string[];
  workFor: string | null;
  clientWebsiteCount: string | null;
  foundVia: string | null;
  mcpSetupIntent: string | null;
};

export const onboardingAnswersQueryOptions = () =>
  queryOptions({
    queryKey: ["onboardingAnswers"],
    queryFn: () => getOnboardingAnswers(),
  });

// Saved answers normalize "Other" selections into free text, so restoring the
// UI means mapping any value that isn't a known option back onto "Other".
function restoreSingleChoice(
  saved: string | null,
  options: readonly string[],
): { value: string; other: string } {
  if (!saved) return { value: "", other: "" };
  if (options.includes(saved)) return { value: saved, other: "" };
  return { value: "Other", other: saved };
}

export function restoreOnboardingAnswers(
  saved: SavedOnboardingAnswers,
): OnboardingAnswers {
  const known = saved.interestedFeatures.filter((value) =>
    (INTEREST_OPTIONS as readonly string[]).includes(value),
  );
  const custom = saved.interestedFeatures.filter(
    (value) => !(INTEREST_OPTIONS as readonly string[]).includes(value),
  );
  const work = restoreSingleChoice(saved.workFor, WORK_FOR_OPTIONS);
  const found = restoreSingleChoice(saved.foundVia, SOURCE_OPTIONS);

  return {
    selectedInterests: custom.length > 0 ? [...known, "Other"] : known,
    interestOther: custom[0] ?? "",
    workFor: work.value,
    workForOther: work.other,
    clientWebsiteCount:
      work.value === CLIENT_WORK_FOR ? (saved.clientWebsiteCount ?? "") : "",
    source: found.value,
    sourceOther: found.other,
  };
}

/**
 * Convert the in-progress form into the persisted payload. `step` decides which
 * fields are mature enough to write so we don't clobber later answers on save.
 */
export function buildOnboardingPayload(
  answers: OnboardingAnswers,
  step: number,
  extra: { mcpSetupIntent?: "yes" | "no"; completed?: boolean } = {},
) {
  const interestedFeatures = answers.selectedInterests.map((value) =>
    value === "Other" && answers.interestOther.trim()
      ? answers.interestOther.trim()
      : value,
  );
  const workFor =
    answers.workFor === "Other" && answers.workForOther.trim()
      ? answers.workForOther.trim()
      : answers.workFor || undefined;
  // Only persist a client-site estimate when "My clients" is selected; clear it
  // otherwise so a stale value from an earlier pass doesn't linger.
  const clientWebsiteCount =
    answers.workFor === CLIENT_WORK_FOR ? answers.clientWebsiteCount : "";
  const foundVia =
    answers.source === "Other" && answers.sourceOther.trim()
      ? answers.sourceOther.trim()
      : answers.source || undefined;

  return {
    ...(step >= 0 ? { interestedFeatures } : {}),
    ...(step >= 1 ? { workFor, clientWebsiteCount } : {}),
    ...(step >= 2 ? { foundVia } : {}),
    ...extra,
  };
}
