import { Check, ChevronDown, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormattedMessage, useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";

export function Collapsible({
  id,
  title,
  subtitle,
  icon,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = `collapsible-${id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-base-300"
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="flex size-5 shrink-0 items-center justify-center text-base-content">
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-base-content">
              {title}
            </span>
            {subtitle ? (
              <span className="text-xs text-base-content/55">{subtitle}</span>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-base-content/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div id={contentId} className="space-y-4 px-4 pb-6 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-base-300 bg-base-100">
      <pre className="min-w-0 flex-1 overflow-x-auto p-3 text-xs leading-relaxed text-base-content">
        <code className="font-mono">{code}</code>
      </pre>
      <div className="flex shrink-0 items-start border-l border-base-300 p-1.5">
        <CopyButton
          value={code}
          successMessageId="aiWorkspace.copy.copiedToClipboard"
          iconOnly
        />
      </div>
    </div>
  );
}

export function CopyButton({
  value,
  successMessageId,
  iconOnly = false,
}: {
  value: string;
  // A message id, not a sentence: this button is rendered from the `/ai` page,
  // the setup guides and the skills section, so a caller passing prose would
  // ship English into a Vietnamese page from three places at once.
  successMessageId: MessageId;
  iconOnly?: boolean;
}) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error(
        intl.formatMessage({ id: "aiWorkspace.copy.clipboardUnavailable" }),
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(intl.formatMessage({ id: successMessageId }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(intl.formatMessage({ id: "aiWorkspace.copy.failed" }));
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={intl.formatMessage({ id: "aiWorkspace.copy.ariaLabel" })}
        className="flex size-7 items-center justify-center rounded-md text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
      >
        {copied ? (
          <Check className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-2 py-1 text-xs font-medium text-base-content/70 transition-colors hover:bg-base-300 hover:text-base-content"
    >
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3" />
      )}
      <FormattedMessage id="aiWorkspace.copy.action" />
    </button>
  );
}
