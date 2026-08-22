import type { Messages } from "./en";
import { common } from "./vi/common";
import { shell } from "./vi/shell";
import { members } from "./vi/members";
import { commandCenter } from "./vi/commandCenter";
import { seoProvider } from "./vi/seoProvider";
import { audit } from "./vi/audit";
import { auditChrome } from "./vi/auditChrome";
import { auditPanels } from "./vi/auditPanels";
import { auditOps } from "./vi/auditOps";
import { rankTable } from "./vi/rankTable";
import { rankConfig } from "./vi/rankConfig";
import { rankCharts } from "./vi/rankCharts";
import { searchPerformance } from "./vi/searchPerformance";
import { gsc } from "./vi/gsc";
import { keywordResearch } from "./vi/keywordResearch";
import { keywordUi } from "./vi/keywordUi";
import { savedTable } from "./vi/savedTable";
import { savedModals } from "./vi/savedModals";
import { onboarding } from "./vi/onboarding";
import { onboardingChat } from "./vi/onboardingChat";
import { auth } from "./vi/auth";
import { authRecovery } from "./vi/authRecovery";

// Vietnamese catalog — machine-translated seed, pending human review (see
// README.md). Typed as `Messages` so the compiler fails if any English key is
// missing or misspelled, guaranteeing catalog parity at build time. Entries
// live in ./vi/* split by feature area; this file only composes them.
export const vi: Messages = {
  ...shell,
  ...members,
  ...commandCenter,
  ...seoProvider,
  ...common,
  ...audit,
  ...auditChrome,
  ...auditPanels,
  ...auditOps,
  ...rankTable,
  ...rankConfig,
  ...rankCharts,
  ...searchPerformance,
  ...gsc,
  ...keywordResearch,
  ...keywordUi,
  ...savedTable,
  ...savedModals,
  ...onboarding,
  ...onboardingChat,
  ...auth,
  ...authRecovery,
};
