import { z } from "zod";

/**
 * The reader's locale as it arrives on a chat message body.
 *
 * Both chat surfaces - onboarding and the assisted workspace - stream replies
 * that never pass through react-intl, so the locale has to travel with the
 * message rather than being read from a provider. It is client-supplied and
 * therefore untrusted: `.catch("en")` means a missing, misspelled or hostile
 * value degrades to English instead of throwing inside a Durable Object where
 * the error would reach the reader as a dead socket.
 */
export const chatLocaleSchema = z.enum(["en", "vi"]).catch("en");

export type ChatLocale = z.infer<typeof chatLocaleSchema>;
