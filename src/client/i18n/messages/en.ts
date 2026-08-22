import { common } from "./en/common";
import { shell } from "./en/shell";
import { members } from "./en/members";
import { commandCenter } from "./en/commandCenter";
import { seoProvider } from "./en/seoProvider";
import { audit } from "./en/audit";
import { auditChrome } from "./en/auditChrome";
import { auditPanels } from "./en/auditPanels";
import { auditOps } from "./en/auditOps";
import { rankTable } from "./en/rankTable";
import { rankConfig } from "./en/rankConfig";
import { rankCharts } from "./en/rankCharts";
import { searchPerformance } from "./en/searchPerformance";
import { gsc } from "./en/gsc";
import { keywordResearch } from "./en/keywordResearch";
import { keywordUi } from "./en/keywordUi";
import { savedTable } from "./en/savedTable";
import { savedModals } from "./en/savedModals";
import { onboarding } from "./en/onboarding";
import { onboardingChat } from "./en/onboardingChat";
import { auth } from "./en/auth";
import { authRecovery } from "./en/authRecovery";
import { domainOverview } from "./en/domainOverview";
import { domainTables } from "./en/domainTables";
import { backlinksOverview } from "./en/backlinksOverview";
import { backlinksTables } from "./en/backlinksTables";

// English catalog — the source of truth for message IDs. Every other locale is
// typed against this catalog's keys, so adding a key here forces every locale to
// supply it. Keep IDs namespaced by surface (nav / account / language). Entries
// live in ./en/* split by feature area; this file only composes them.
export const en = {
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
  ...domainOverview,
  ...domainTables,
  ...backlinksOverview,
  ...backlinksTables,
} as const;

export type MessageId = keyof typeof en;

export type Messages = Record<MessageId, string>;
