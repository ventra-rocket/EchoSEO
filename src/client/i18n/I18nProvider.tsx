import * as React from "react";
import { IntlProvider } from "react-intl";
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
 * Wraps the app in react-intl with the client-resolved locale. Mounted inside
 * <ClientOnly>, so `readClientLocale()` runs on the client during the lazy state
 * initializer — there is no server-rendered app HTML to mismatch, so no flash
 * of the default locale and no hydration reconciliation.
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

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={MESSAGES[locale]}
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
