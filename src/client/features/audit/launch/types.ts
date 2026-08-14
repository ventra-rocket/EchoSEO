import { AUDIT_MAX_PAGES, AUDIT_MIN_PAGES } from "@/shared/audit-limits";

export const MIN_PAGES = AUDIT_MIN_PAGES;
export const MAX_PAGES_LIMIT = AUDIT_MAX_PAGES;

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
