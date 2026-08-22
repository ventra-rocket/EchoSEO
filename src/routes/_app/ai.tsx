import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { AiSetupGuides } from "@/client/features/ai-mcp/AiSetupGuides";
import { AiSkillsSection } from "@/client/features/ai-mcp/AiSkillsSection";
import { AvailableTools } from "@/client/features/ai-mcp/AvailableTools";
import { CopyButton } from "@/client/features/ai-mcp/SetupControls";
import type { MessageId } from "@/client/i18n/messages";

const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";
const SUPPORT_EMAIL = "ventrarocket.work@gmail.com";
const SAM_GITHUB_URL = "https://github.com/every-app/sam";

// Each roadmap item's copy is a pair of message ids, not prose, so the list
// below renders them through FormattedMessage rather than holding strings.
const ROADMAP_ITEMS: { titleId: MessageId; descriptionId: MessageId }[] = [
  {
    titleId: "aiWorkspace.roadmap.researchAgent.title",
    descriptionId: "aiWorkspace.roadmap.researchAgent.description",
  },
  {
    titleId: "aiWorkspace.roadmap.contentAssistant.title",
    descriptionId: "aiWorkspace.roadmap.contentAssistant.description",
  },
];

export const Route = createFileRoute("/_app/ai")({
  component: AiPage,
});

function AiPage() {
  const mcpUrl =
    typeof window === "undefined"
      ? "https://echoseo.ventrarocket.vn/mcp"
      : `${window.location.origin}/mcp`;

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-12 md:px-6 md:py-16 pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">
          <FormattedMessage id="nav.aiMcp" />
        </h1>
        <p className="mt-2 text-sm text-base-content/70 leading-relaxed">
          <FormattedMessage id="aiWorkspace.page.subtitle" />
        </p>

        <section className="mt-8">
          <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                <FormattedMessage id="aiWorkspace.mcpUrl.label" />
              </p>
              <CopyButton
                value={mcpUrl}
                successMessageId="aiWorkspace.mcpUrl.copied"
              />
            </div>
            <code className="mt-2 block break-all font-mono text-sm text-base-content">
              {mcpUrl}
            </code>
          </div>
          <p className="mt-2.5 text-xs text-base-content/55 leading-relaxed">
            <FormattedMessage id="aiWorkspace.mcpUrl.description" />
          </p>
        </section>

        <AiSetupGuides mcpUrl={mcpUrl} />

        <AiSkillsSection />

        <section className="mt-12">
          <h2 className="text-base font-semibold">
            <FormattedMessage id="aiWorkspace.availableTools.heading" />
          </h2>
          <div className="mt-5">
            <AvailableTools />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-base font-semibold">
            <FormattedMessage id="aiWorkspace.openSource.heading" />
          </h2>
          <p className="mt-1.5 text-sm text-base-content/70 leading-relaxed">
            <FormattedMessage id="aiWorkspace.openSource.body" />
          </p>
          <a
            href={SAM_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-base-content transition-colors hover:text-base-content/60"
          >
            <FormattedMessage id="aiWorkspace.openSource.link" />
            <ArrowUpRight className="size-3.5" />
          </a>
        </section>

        <section className="mt-12">
          <h2 className="text-base font-semibold">
            <FormattedMessage id="aiWorkspace.roadmap.heading" />
          </h2>
          <ul className="mt-4 space-y-3">
            {ROADMAP_ITEMS.map((item) => (
              <li key={item.titleId} className="flex gap-2.5 text-sm">
                <span className="mt-[2px] shrink-0 text-base-content/40">
                  &mdash;
                </span>
                <span className="text-base-content/70">
                  <span className="font-medium text-base-content">
                    <FormattedMessage id={item.titleId} />
                  </span>
                  <br />
                  <FormattedMessage id={item.descriptionId} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-xs text-base-content/55 leading-relaxed">
          <FormattedMessage
            id="aiWorkspace.footer.feedback"
            values={{
              discordLink: (chunks) => (
                <a
                  className="link link-primary"
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {chunks}
                </a>
              ),
              email: SUPPORT_EMAIL,
              emailLink: (chunks) => (
                <a
                  className="link link-primary"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {chunks}
                </a>
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
}
