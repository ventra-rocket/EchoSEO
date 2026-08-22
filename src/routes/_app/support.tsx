import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormattedMessage, useIntl } from "react-intl";

const SUPPORT_EMAIL = "ventrarocket.work@gmail.com";
const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";
const GITHUB_URL = "https://github.com/ventra-rocket/EchoSEO";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function SupportPage() {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast.success(
      intl.formatMessage({ id: "helpSupport.support.email.copiedToast" }),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-8">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-medium text-base-content/40">
          <FormattedMessage id="account.help" />
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          <FormattedMessage id="helpSupport.support.title" />
        </h1>
        <p className="mt-2 text-sm text-base-content/60">
          <FormattedMessage id="helpSupport.support.intro" />
        </p>

        <div className="mt-8 space-y-3">
          <div className="rounded-lg border border-base-300 px-5 py-4">
            <p className="text-sm font-semibold">
              <FormattedMessage id="helpSupport.support.email.label" />
            </p>
            <p className="mt-1 text-sm text-base-content/60">
              <FormattedMessage id="helpSupport.support.email.description" />
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-200/50 px-3 py-1.5 text-sm font-medium text-base-content transition-colors hover:bg-base-200"
            >
              <span className="font-mono text-xs">{SUPPORT_EMAIL}</span>
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5 text-base-content/40" />
              )}
            </button>
          </div>

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-base-300 px-5 py-4 transition-colors hover:border-base-content/20"
          >
            <p className="text-sm font-semibold">
              <FormattedMessage id="helpSupport.support.discord.label" />
            </p>
            <p className="mt-1 text-sm text-base-content/60">
              <FormattedMessage id="helpSupport.support.discord.description" />
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-base-content">
              <FormattedMessage id="helpSupport.support.discord.cta" />
              <span aria-hidden="true">&rarr;</span>
            </span>
          </a>

          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-base-300 px-5 py-4 transition-colors hover:border-base-content/20"
          >
            <p className="text-sm font-semibold">
              <FormattedMessage id="helpSupport.support.github.label" />
            </p>
            <p className="mt-1 text-sm text-base-content/60">
              <FormattedMessage id="helpSupport.support.github.description" />
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-base-content">
              <FormattedMessage id="helpSupport.support.github.cta" />
              <span aria-hidden="true">&rarr;</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
