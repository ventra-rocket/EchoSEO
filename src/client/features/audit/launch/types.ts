import { AUDIT_MAX_PAGES, AUDIT_MIN_PAGES } from "@/shared/audit-limits";

export const MIN_PAGES = AUDIT_MIN_PAGES;
export const MAX_PAGES_LIMIT = AUDIT_MAX_PAGES;

/**
 * Above this crawl size the launch asks for a confirmation first. The default is
 * the ceiling, so this fires on the default path: a 5,000-page crawl is a long
 * background job, and "I meant my own small site" is worth catching once.
 */
export const LARGE_CRAWL_CONFIRM_PAGES = 500;

export type LaunchFormValues = {
  url: string;
  maxPagesInput: string;
  runLighthouse: boolean;
};

export const DEFAULT_LAUNCH_FORM_VALUES: LaunchFormValues = {
  url: "",
  maxPagesInput: String(AUDIT_MAX_PAGES),
  runLighthouse: false,
};

/** Exactly what a launch sends, captured before a confirmation is asked for. */
export type LaunchRequest = {
  projectId: string;
  startUrl: string;
  maxPages: number;
  lighthouseStrategy: "auto" | "none";
};
