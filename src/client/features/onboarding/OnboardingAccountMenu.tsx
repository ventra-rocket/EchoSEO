import { Settings, User } from "lucide-react";
import { useIntl } from "react-intl";
import { ThemePreferenceMenuItems } from "@/client/components/ThemePreferenceMenuItems";
import { signOutAndRedirect } from "@/lib/auth-client";

// Account dropdown shared by the onboarding wizard and the onboarding chat so a
// signed-in user can reach Settings / theme / sign out from either surface.
// Fixed top-right; renders nothing until we know the user's email.
//
// Reuses the shell's account.* message ids (see src/client/layout/AppShell.tsx
// AccountMenu) rather than spelling the same three facts again under a new
// onboardingChat.* id: this menu's aria-label, "Settings" and "Sign out" are
// the exact same facts as the app shell's account menu.
export function OnboardingAccountMenu({
  email,
}: {
  email: string | undefined;
}) {
  const intl = useIntl();
  if (!email) return null;

  return (
    <div className="fixed top-4 right-4">
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-circle"
          aria-label={intl.formatMessage({ id: "account.menuLabel" })}
        >
          <User className="h-5 w-5" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-20 menu mt-3 min-w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          <li className="menu-title max-w-full">
            <span className="truncate text-base-content" data-ph-mask>
              {email}
            </span>
          </li>
          <li>
            <a href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {intl.formatMessage({ id: "account.settings" })}
            </a>
          </li>
          <ThemePreferenceMenuItems />
          <li>
            <button type="button" onClick={() => signOutAndRedirect()}>
              {intl.formatMessage({ id: "account.signOut" })}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
