import { FormattedMessage, useIntl } from "react-intl";
import { ClaudeIcon, CodexIcon } from "@/client/features/ai-mcp/AgentIcons";
import { CodeBlock, Collapsible } from "@/client/features/ai-mcp/SetupControls";

const SKILL_NAMES = [
  "seo-project-setup",
  "seo-coach",
  "keyword-research",
  "keyword-clustering",
  "competitive-landscape",
  "competitor-analysis",
  "link-prospecting",
];
const SKILLS_INSTALL = `npx skills add ventra-rocket/EchoSEO`;
const ALL_SKILLS_INSTALL = `npx skills add ventra-rocket/EchoSEO --skill '*'`;
const CLAUDE_CODE_SKILLS_INSTALL = `npx skills add ventra-rocket/EchoSEO --skill '*' --agent claude-code`;
const CODEX_SKILLS_INSTALL = `npx skills add ventra-rocket/EchoSEO --skill '*' --agent codex`;
const SKILLS_MANUAL_INSTALL = `git clone https://github.com/ventra-rocket/EchoSEO.git

# Codex
mkdir -p ~/.codex/skills
cp -R EchoSEO/.agents/skills/* ~/.codex/skills/

# Claude Code
mkdir -p ~/.claude/skills
cp -R EchoSEO/.agents/skills/* ~/.claude/skills/`;

/**
 * The EchoSEO Skills install guide on the /ai page (routes/_app/ai.tsx).
 * Split out so AiPage stays under the max-lines-per-function ceiling — same
 * move as AuditSnapshotRepository and KeywordResearchDesktopFilters.
 */
export function AiSkillsSection() {
  const intl = useIntl();
  return (
    <section className="mt-12">
      <h2 className="text-base font-semibold">
        <FormattedMessage id="aiWorkspace.skills.heading" />
      </h2>
      <p className="mt-1.5 text-sm text-base-content/70 leading-relaxed">
        <FormattedMessage id="aiWorkspace.skills.subtitle" />
      </p>
      <div className="mt-4 divide-y divide-base-300 overflow-hidden rounded-lg border border-base-300 bg-base-200">
        <Collapsible
          id="skills-add"
          title={intl.formatMessage({
            id: "aiWorkspace.skills.installViaSkillsAdd.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.skills.installViaSkillsAdd.subtitle",
          })}
        >
          <CodeBlock code={SKILLS_INSTALL} />
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiWorkspace.skills.autoAccept" />
          </p>
          <CodeBlock code={ALL_SKILLS_INSTALL} />
        </Collapsible>
        <Collapsible
          id="claude-code-skills"
          title={intl.formatMessage({
            id: "aiWorkspace.skills.claudeCodeInstall.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.skills.claudeCodeInstall.subtitle",
          })}
          icon={<ClaudeIcon className="size-5" />}
        >
          <CodeBlock code={CLAUDE_CODE_SKILLS_INSTALL} />
        </Collapsible>
        <Collapsible
          id="codex-skills"
          title={intl.formatMessage({
            id: "aiWorkspace.skills.codexInstall.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.skills.codexInstall.subtitle",
          })}
          icon={<CodexIcon className="size-5" />}
        >
          <CodeBlock code={CODEX_SKILLS_INSTALL} />
        </Collapsible>
        <Collapsible
          id="manual-skills"
          title={intl.formatMessage({
            id: "aiWorkspace.skills.manualInstall.title",
          })}
          subtitle={intl.formatMessage({
            id: "aiWorkspace.skills.manualInstall.subtitle",
          })}
        >
          <CodeBlock code={SKILLS_MANUAL_INSTALL} />
        </Collapsible>
      </div>
      <div className="mt-5">
        <p className="text-sm text-base-content/70 leading-relaxed">
          <FormattedMessage
            id="aiWorkspace.skills.startWith"
            values={{
              cmd: (chunks) => (
                <span className="font-mono text-base-content">{chunks}</span>
              ),
            }}
          />
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-base-content/50">
          <FormattedMessage id="aiWorkspace.skills.availableHeading" />
        </p>
        <ul className="mt-2 grid gap-1.5 text-sm text-base-content/70 sm:grid-cols-2">
          {SKILL_NAMES.map((skill) => (
            <li key={skill} className="flex gap-2">
              <span className="text-base-content/35">-</span>
              <span>{skill}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
