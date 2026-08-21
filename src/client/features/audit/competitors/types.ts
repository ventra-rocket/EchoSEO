import type { getCompetitorComparison } from "@/serverFunctions/audit";

export type CompetitorComparison = Awaited<
  ReturnType<typeof getCompetitorComparison>
>[number];

export type CompetitorPair = CompetitorComparison["pairs"][number];
