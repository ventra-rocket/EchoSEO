import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

export type Filters = {
  include: string;
  exclude: string;
  minDesktopPos: string;
  maxDesktopPos: string;
  minMobilePos: string;
  maxMobilePos: string;
  minVolume: string;
  maxVolume: string;
  minKd: string;
  maxKd: string;
  minCpc: string;
  maxCpc: string;
};

export type DomainFilterableConfig = Pick<
  RankTrackingConfig,
  "domain" | "devices" | "locationCode"
>;

export type DomainListFilters = {
  query: string;
  device: "all" | RankTrackingConfig["devices"];
  locationCode: string;
};

export type DomainListFilterOption = { value: string; label: string };

export const EMPTY_FILTERS: Filters = {
  include: "",
  exclude: "",
  minDesktopPos: "",
  maxDesktopPos: "",
  minMobilePos: "",
  maxMobilePos: "",
  minVolume: "",
  maxVolume: "",
  minKd: "",
  maxKd: "",
  minCpc: "",
  maxCpc: "",
};

export const EMPTY_DOMAIN_LIST_FILTERS: DomainListFilters = {
  query: "",
  device: "all",
  locationCode: "all",
};
