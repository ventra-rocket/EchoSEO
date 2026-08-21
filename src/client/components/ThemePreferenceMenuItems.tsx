import { Monitor, Moon, Sun } from "lucide-react";
import { useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { type ThemePreference, useThemePreference } from "@/client/lib/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  labelId: MessageId;
  icon: typeof Sun;
}[] = [
  { value: "system", labelId: "common.theme.system", icon: Monitor },
  { value: "light", labelId: "common.theme.light", icon: Sun },
  { value: "dark", labelId: "common.theme.dark", icon: Moon },
];

export function ThemePreferenceMenuItems() {
  const intl = useIntl();
  const { themePreference, setThemePreference } = useThemePreference();

  return (
    <>
      <li className="menu-title pt-2">
        <span>{intl.formatMessage({ id: "common.theme.title" })}</span>
      </li>

      <li>
        <div
          role="radiogroup"
          aria-label={intl.formatMessage({
            id: "common.theme.preferenceAria",
          })}
          className="flex gap-0.5 rounded-lg bg-base-200 p-0.5"
        >
          {THEME_OPTIONS.map((option) => {
            const label = intl.formatMessage({ id: option.labelId });
            const isActive = option.value === themePreference;
            const Icon = option.icon;

            return (
              <div
                key={option.value}
                className="tooltip tooltip-bottom flex flex-1 before:whitespace-nowrap"
                data-tip={label}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={label}
                  className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 transition-colors ${
                    isActive
                      ? "bg-base-100 text-base-content shadow-sm"
                      : "text-base-content/50 hover:text-base-content/80"
                  }`}
                  onClick={() => setThemePreference(option.value)}
                >
                  <Icon className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      </li>
    </>
  );
}
