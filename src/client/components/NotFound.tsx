import { useRouterState } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { getRouteOwnedLocale } from "@/client/i18n/config";
import { I18nProvider } from "@/client/i18n/I18nProvider";

export function LocalizedNotFound() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <I18nProvider locale={getRouteOwnedLocale(pathname)}>
      <NotFound />
    </I18nProvider>
  );
}

export function NotFound({ children }: { children?: React.ReactNode }) {
  const intl = useIntl();
  return (
    <div className="space-y-2 p-4">
      <h1 className="text-2xl">404</h1>
      <div className="text-base-content/70">
        {children || (
          <p>{intl.formatMessage({ id: "common.notFound.body" })}</p>
        )}
      </div>
    </div>
  );
}
