import {
  BarChart3,
  Bookmark,
  Bot,
  ClipboardCheck,
  Globe,
  Link2,
  type LucideIcon,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
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

  return [
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
    {
      type: "standalone" as const,
      item: aiNavItem,
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
