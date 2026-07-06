import type { Locale } from "@/client/i18n/config";
import { en, type Messages } from "./en";
import { vi } from "./vi";

export type { MessageId } from "./en";

/** Bundled message catalogs, one per supported locale. */
export const MESSAGES: Record<Locale, Messages> = { en, vi };
