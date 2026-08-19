import {
  BarChart3,
  Bookmark,
  Bot,
  ClipboardCheck,
  LayoutDashboard,
  Globe,
  Link2,
  type LucideIcon,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import type { MessageId } from "@/client/i18n/messages";

// Nav labels are message IDs resolved at the render site with react-intl, so the
// sidebar/topbar are bilingual. `as const satisfies` keeps `to`/`matchSegment`
// as literals (needed by TanStack Router) while type-checking every `labelId`
// against the message catalog — a typo here is a build error.
type NavItemDef = {
  to: string;
  labelId: MessageId;
  icon: LucideIcon;
  matchSegment: string;
};

const projectNavItems = [
  {
    to: "/p/$projectId",
    labelId: "nav.overview",
    icon: LayoutDashboard,
    matchSegment: "/",
  },
  {
    to: "/p/$projectId/keywords",
    labelId: "nav.keywordResearch",
    icon: Search,
    matchSegment: "/keywords",
  },
  {
    to: "/p/$projectId/saved",
    labelId: "nav.savedKeywords",
    icon: Bookmark,
    matchSegment: "/saved",
  },
  {
    to: "/p/$projectId/rank-tracking",
    labelId: "nav.rankTracking",
    icon: TrendingUp,
    matchSegment: "/rank-tracking",
  },
  {
    to: "/p/$projectId/search-performance",
    labelId: "nav.searchPerformance",
    icon: BarChart3,
    matchSegment: "/search-performance",
  },
  {
    to: "/p/$projectId/domain",
    labelId: "nav.domainOverview",
    icon: Globe,
    matchSegment: "/domain",
  },
  {
    to: "/p/$projectId/backlinks",
    labelId: "nav.backlinks",
    icon: Link2,
    matchSegment: "/backlinks",
  },
  {
    to: "/p/$projectId/audit",
    labelId: "nav.siteAudit",
    icon: ClipboardCheck,
    matchSegment: "/audit",
  },
  {
    to: "/p/$projectId/brand-lookup",
    labelId: "nav.brandLookup",
    icon: Sparkles,
    matchSegment: "/brand-lookup",
  },
  {
    to: "/p/$projectId/prompt-explorer",
    labelId: "nav.promptExplorer",
    icon: MessageSquare,
    matchSegment: "/prompt-explorer",
  },
  {
    to: "/p/$projectId/assistant",
    labelId: "nav.assistantWorkspace",
    icon: Bot,
    matchSegment: "/assistant",
  },
] as const satisfies readonly NavItemDef[];

const aiNavItem = linkOptions({
  to: "/ai" as const,
  labelId: "nav.aiMcp" satisfies MessageId,
  icon: Bot,
  matchSegment: "/ai",
});

function getProjectNavItems(projectId: string) {
  return linkOptions(
    projectNavItems.map((item) => ({
      ...item,
      params: { projectId },
      search: {},
    })),
  );
}

export function getProjectNavGroups(projectId: string) {
  const all = getProjectNavItems(projectId);
  const bySegment = (seg: string) => all.find((i) => i.matchSegment === seg)!;

  // The assistant workspace is unavailable in hosted mode by construction —
  // `getAssistantWorkspaceIdentity` returns `available: false` there to avoid
  // unmanaged model spend. Advertising it in the nav sends users to a page whose
  // only content is that refusal, so hosted builds do not list it. Self-host
  // keeps it: with an OPENROUTER_API_KEY it answers.
  return [
    {
      type: "standalone" as const,
      item: bySegment("/"),
    },
    {
      type: "group" as const,
      labelId: "nav.group.keywords" satisfies MessageId,
      icon: Search,
      matchSegments: ["/keywords", "/saved", "/rank-tracking"],
      items: [
        bySegment("/keywords"),
        bySegment("/saved"),
        bySegment("/rank-tracking"),
      ],
    },
    {
      type: "standalone" as const,
      item: bySegment("/search-performance"),
    },
    {
      type: "group" as const,
      labelId: "nav.group.domain" satisfies MessageId,
      icon: Globe,
      matchSegments: ["/domain", "/backlinks", "/audit"],
      items: [
        bySegment("/domain"),
        bySegment("/backlinks"),
        bySegment("/audit"),
      ],
    },
    {
      type: "group" as const,
      labelId: "nav.group.aiVisibility" satisfies MessageId,
      icon: Sparkles,
      matchSegments: ["/brand-lookup", "/prompt-explorer"],
      items: [bySegment("/brand-lookup"), bySegment("/prompt-explorer")],
    },
    ...(isHostedClientAuthMode()
      ? []
      : [
          {
            type: "standalone" as const,
            item: bySegment("/assistant"),
          },
        ]),
    {
      type: "standalone" as const,
      item: aiNavItem,
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
