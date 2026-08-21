import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";

/**
 * The one state for "this surface needs DataForSEO and the workspace has no
 * key". Every DataForSEO-backed query composes `enabled: ...configured === true`,
 * so with no key nothing is requested — and each surface used to fill the gap
 * with its own "no results", "enter a domain" or "request failed" copy, which
 * reports absence of evidence as evidence of absence.
 *
 * Deliberately offers no retry: a retry cannot send a request the key gate is
 * blocking, so the only action that can help is adding the key.
 */
export function DataforseoKeyMissingState() {
  return (
    <section className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-6 text-center space-y-3">
      <KeyRound className="size-9 mx-auto text-base-content/35" />
      <div className="space-y-1.5">
        <p className="text-base font-medium text-base-content/80">
          <FormattedMessage id="seoProvider.keyMissing.title" />
        </p>
        <p className="mx-auto max-w-lg text-sm text-base-content/60">
          <FormattedMessage id="seoProvider.keyMissing.description" />
        </p>
      </div>
      <Link
        {...dataforseoHelpLinkOptions}
        className="link link-primary text-sm font-medium"
      >
        <FormattedMessage id="seoProvider.keyMissing.helpLink" />
      </Link>
    </section>
  );
}
