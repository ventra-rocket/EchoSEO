import * as React from "react";
import { IntlProvider, MissingTranslationError } from "react-intl";
import {
  DEFAULT_LOCALE,
  type Locale,
  persistLocale,
  readClientLocale,
} from "@/client/i18n/config";
import { MESSAGES } from "@/client/i18n/messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

/**
 * Wraps the authenticated app in react-intl with the client-resolved locale.
 * Mounted inside the `<ClientOnly>` island in `__root.tsx`, so
 * `readClientLocale()` runs on the client during the lazy state initializer —
 * that part of the tree has no server-rendered HTML to mismatch, so no flash of
 * the default locale and no hydration reconciliation. Public indexable routes do
 * NOT use this cookie-driven provider: they take their locale from the URL (see
 * FreeSeoCheckLanding), so each language is a crawlable per-URL signal rather than
 * a cookie the crawler never sends.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() =>
    readClientLocale(),
  );

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  const value = React.useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  /**
   * Without this, a wrong message id is silent. react-intl's default handler
   * logs and moves on, and its fallback renders the id itself — so a caller
   * that passed `intl.formatMessage(...)` where an *id* was expected threw
   * `MissingTranslationError` on all four columns of the keyword-suggestion
   * table on every render, while the screen looked perfectly translated,
   * because the "missing id" it echoed back was the finished sentence.
   *
   * Both catalogs are complete by construction: `vi` is typed
   * `Record<keyof typeof en, string>`, so TypeScript refuses a missing or
   * misspelled key. A missing translation at runtime therefore cannot be a
   * translation gap — it is always a bad id. In development that should stop
   * the render and be seen; in production it must not white-screen a page over
   * a copy bug, so it is logged with the id that failed.
   */
  const handleError = React.useCallback((error: unknown) => {
    if (error instanceof MissingTranslationError) {
      if (import.meta.env.DEV) throw error;
      console.error("i18n: unknown message id", error.message);
      return;
    }
    console.error(error);
  }, []);

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={MESSAGES[locale]}
        onError={handleError}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

/** Read + change the active locale. Must be called under <I18nProvider>. */
export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <I18nProvider>");
  }
  return ctx;
}
