import { useIntl } from "react-intl";
import { Languages } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/client/i18n/config";
import type { MessageId } from "@/client/i18n/messages";
import { useLocale } from "@/client/i18n/I18nProvider";

const LOCALE_LABEL_ID: Record<Locale, MessageId> = {
  en: "language.english",
  vi: "language.vietnamese",
};

/** Topbar dropdown to switch the UI language. Persists the choice + re-renders. */
export function LanguageSwitcher() {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
        aria-label={intl.formatMessage({ id: "language.switchLabel" })}
      >
        <Languages className="h-4 w-4" />
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content z-20 menu mt-3 min-w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <li key={code}>
            <button
              type="button"
              className={code === locale ? "font-medium text-primary" : ""}
              aria-current={code === locale}
              onClick={() => {
                setLocale(code);
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
            >
              {intl.formatMessage({ id: LOCALE_LABEL_ID[code] })}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
