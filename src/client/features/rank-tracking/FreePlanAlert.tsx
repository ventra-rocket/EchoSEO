import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanAlert({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="alert alert-warning text-sm py-2">
      <AlertTriangle className="size-4" />
      <span>
        <FormattedMessage
          id="rank.config.freePlan.body"
          values={{
            link: (chunks) => (
              <Link
                to={SUBSCRIBE_ROUTE}
                search={{ upgrade: true }}
                className="link font-medium"
              >
                {chunks}
              </Link>
            ),
          }}
        />
      </span>
    </div>
  );
}
