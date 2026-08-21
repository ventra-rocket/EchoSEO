import { shell } from "./en/shell";
import { members } from "./en/members";
import { commandCenter } from "./en/commandCenter";
import { seoProvider } from "./en/seoProvider";
import { audit } from "./en/audit";
import { auditChrome } from "./en/auditChrome";
import { auditPanels } from "./en/auditPanels";
import { auditOps } from "./en/auditOps";

// English catalog — the source of truth for message IDs. Every other locale is
// typed against this catalog's keys, so adding a key here forces every locale to
// supply it. Keep IDs namespaced by surface (nav / account / language). Entries
// live in ./en/* split by feature area; this file only composes them.
export const en = {
  ...shell,
  ...members,
  ...commandCenter,
  ...seoProvider,
  ...audit,
  ...auditChrome,
  ...auditPanels,
  ...auditOps,
} as const;

export type MessageId = keyof typeof en;

export type Messages = Record<MessageId, string>;
