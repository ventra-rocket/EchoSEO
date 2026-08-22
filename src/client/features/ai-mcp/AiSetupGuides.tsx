import { FormattedMessage, useIntl } from "react-intl";
import { ClaudeIcon, CodexIcon } from "@/client/features/ai-mcp/AgentIcons";
import { CodeBlock, Collapsible } from "@/client/features/ai-mcp/SetupControls";

/**
 * Per-agent MCP connection guides on the /ai page (routes/_app/ai.tsx).
 * Split out so AiPage stays under the max-lines-per-function ceiling — same
 * move as AuditSnapshotRepository and KeywordResearchDesktopFilters.
 */
export function AiSetupGuides({ mcpUrl }: { mcpUrl: string }) {
  const intl = useIntl();
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold">
        <FormattedMessage id="aiWorkspace.setupGuides.heading" />
      </h2>
      <p className="mt-1.5 text-sm text-base-content/70">
        <FormattedMessage id="aiWorkspace.setupGuides.subtitle" />
      </p>
      <div className="mt-4 divide-y divide-base-300 overflow-hidden rounded-lg border border-base-300 bg-base-200">
        <Collapsible
          id="claude-code"
          title={intl.formatMessage({
            id: "aiWorkspace.setupGuides.claudeCode.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.setupGuides.addWithCli",
          })}
          icon={<ClaudeIcon className="size-5" />}
        >
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiWorkspace.setupGuides.runInTerminal" />
          </p>
          <CodeBlock
            code={`claude mcp add --transport http --scope user echoseo ${mcpUrl}`}
          />
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiWorkspace.setupGuides.approveLogin" />
          </p>
        </Collapsible>

        <Collapsible
          id="claude-desktop"
          title={intl.formatMessage({
            id: "aiWorkspace.setupGuides.claudeDesktop.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.setupGuides.claudeDesktop.subtitle",
          })}
          icon={<ClaudeIcon className="size-5" />}
        >
          <ol className="ml-5 list-decimal space-y-1.5 text-sm text-base-content/70 leading-relaxed">
            <li>
              <FormattedMessage
                id="aiWorkspace.setupGuides.claudeDesktop.step1"
                values={{
                  settings: (chunks) => (
                    <span className="text-base-content">{chunks}</span>
                  ),
                  connectors: (chunks) => (
                    <span className="text-base-content">{chunks}</span>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                id="aiWorkspace.setupGuides.claudeDesktop.step2"
                values={{
                  b: (chunks) => (
                    <span className="font-medium text-base-content">
                      {chunks}
                    </span>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage id="aiWorkspace.setupGuides.claudeDesktop.step3" />
            </li>
            <li>
              <FormattedMessage id="aiWorkspace.setupGuides.approveEchoseoLogin" />
            </li>
            <li>
              <FormattedMessage
                id="aiWorkspace.setupGuides.claudeDesktop.step5"
                values={{
                  configure: (chunks) => (
                    <span className="font-medium text-base-content">
                      {chunks}
                    </span>
                  ),
                  alwaysApproved: (chunks) => (
                    <span className="font-medium text-base-content">
                      {chunks}
                    </span>
                  ),
                }}
              />
            </li>
          </ol>
          <p className="text-xs text-base-content/55 leading-relaxed">
            <FormattedMessage id="aiWorkspace.setupGuides.claudeDesktop.requiresPlan" />
          </p>
        </Collapsible>

        <Collapsible
          id="codex"
          title={intl.formatMessage({
            id: "aiWorkspace.setupGuides.codex.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.setupGuides.addWithCli",
          })}
          icon={<CodexIcon className="size-5" />}
        >
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiWorkspace.setupGuides.runInTerminal" />
          </p>
          <CodeBlock code={`codex mcp add echoseo --url ${mcpUrl}`} />
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiWorkspace.setupGuides.approveLogin" />
          </p>
        </Collapsible>

        <Collapsible
          id="codex-desktop"
          title={intl.formatMessage({
            id: "aiWorkspace.setupGuides.codexDesktop.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.setupGuides.codexDesktop.subtitle",
          })}
          icon={<CodexIcon className="size-5" />}
        >
          <ol className="ml-5 list-decimal space-y-1.5 text-sm text-base-content/70 leading-relaxed">
            <li>
              <FormattedMessage
                id="aiWorkspace.setupGuides.codexDesktop.step1"
                values={{
                  path: (chunks) => (
                    <span className="text-base-content">{chunks}</span>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                id="aiWorkspace.setupGuides.codexDesktop.step2"
                values={{
                  b: (chunks) => (
                    <span className="font-medium text-base-content">
                      {chunks}
                    </span>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage id="aiWorkspace.setupGuides.codexDesktop.step3" />
            </li>
            <li>
              <FormattedMessage id="aiWorkspace.setupGuides.approveEchoseoLogin" />
            </li>
          </ol>
        </Collapsible>
      </div>
    </section>
  );
}
