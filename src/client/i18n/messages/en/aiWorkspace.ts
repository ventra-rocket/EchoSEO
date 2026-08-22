// The AI & MCP page (routes/_app/ai.tsx) and the assistant workspace shell +
// conversation (features/assistant-workspace/).
export const aiWorkspace = {
  // routes/_app/ai.tsx — page header. The <h1> reuses `nav.aiMcp` so the
  // sidebar label and the heading cannot disagree (same pattern as Domain
  // Overview and Backlinks reusing their own nav ids), so only the subtitle
  // needs an id here.
  "aiWorkspace.page.subtitle":
    "Connect your AI agent to EchoSEO. Run keyword research, SERP analysis, domain lookups, and backlink reviews from your editor or chat.",

  // MCP server URL card
  "aiWorkspace.mcpUrl.label": "MCP server URL",
  "aiWorkspace.mcpUrl.copied": "MCP URL copied",
  "aiWorkspace.mcpUrl.description":
    "Paste this into any MCP client. This URL points at the EchoSEO instance you are using now, whether hosted, self-hosted, or local. Sign in with EchoSEO when prompted.",

  // Setup guides section
  "aiWorkspace.setupGuides.heading": "Setup guides",
  "aiWorkspace.setupGuides.subtitle": "Pick your agent.",
  // Shared verbatim between the Claude Code and Codex CLI guides below.
  "aiWorkspace.setupGuides.addWithCli": "Add with the CLI",
  "aiWorkspace.setupGuides.runInTerminal": "Run this in your terminal:",
  "aiWorkspace.setupGuides.approveLogin": "Approve the login when prompted.",
  // Shared verbatim between the Claude Desktop and Codex Desktop guides.
  "aiWorkspace.setupGuides.approveEchoseoLogin":
    "Approve the EchoSEO login when prompted.",

  // Client names are data and stay identical in every locale (never
  // translated, same treatment as `nav.aiMcp`'s "AI & MCP"). They still route
  // through the catalog because Collapsible's `title` prop is a plain string
  // a real user reads, not a code snippet.
  "aiWorkspace.setupGuides.claudeCode.title": "Claude Code",
  "aiWorkspace.setupGuides.claudeDesktop.title": "Claude Desktop",
  "aiWorkspace.setupGuides.claudeDesktop.subtitle": "Add a custom connector",
  "aiWorkspace.setupGuides.claudeDesktop.step1":
    "Open <settings>Settings</settings> → <connectors>Connectors</connectors>.",
  "aiWorkspace.setupGuides.claudeDesktop.step2":
    "Click <b>Add custom connector</b>.",
  "aiWorkspace.setupGuides.claudeDesktop.step3":
    "Paste the MCP URL above and click Add.",
  "aiWorkspace.setupGuides.claudeDesktop.step5":
    "Optional: after EchoSEO connects, click <configure>Configure</configure>, then choose <alwaysApproved>Always Approved</alwaysApproved>, except for any tools you want Claude to ask before using.",
  "aiWorkspace.setupGuides.claudeDesktop.requiresPlan":
    "Requires a Claude Pro, Max, Team, or Enterprise plan.",

  "aiWorkspace.setupGuides.codex.title": "Codex",
  "aiWorkspace.setupGuides.codexDesktop.title": "Codex Desktop",
  "aiWorkspace.setupGuides.codexDesktop.subtitle":
    "Settings → Integrations & MCP",
  "aiWorkspace.setupGuides.codexDesktop.step1":
    "Open <path>Settings → Integrations & MCP</path>.",
  "aiWorkspace.setupGuides.codexDesktop.step2": "Click <b>Add your own</b>.",
  "aiWorkspace.setupGuides.codexDesktop.step3": "Paste the MCP URL above.",

  // EchoSEO Skills section
  "aiWorkspace.skills.heading": "EchoSEO Skills",
  "aiWorkspace.skills.subtitle":
    "Skills give Codex and Claude Code reusable SEO workflows that can call your EchoSEO MCP tools when live SERP, keyword, backlink, or domain data is needed.",
  "aiWorkspace.skills.installViaSkillsAdd.title": "Install with skills add",
  "aiWorkspace.skills.installViaSkillsAdd.subtitle":
    "Recommended cross-agent installer",
  "aiWorkspace.skills.autoAccept":
    "You can also auto-accept each EchoSEO skill:",
  "aiWorkspace.skills.claudeCodeInstall.title": "Install for Claude Code",
  "aiWorkspace.skills.claudeCodeInstall.subtitle": "Target Claude Code only",
  "aiWorkspace.skills.codexInstall.title": "Install for Codex",
  "aiWorkspace.skills.codexInstall.subtitle": "Target OpenAI Codex only",
  "aiWorkspace.skills.manualInstall.title": "Manual GitHub install",
  "aiWorkspace.skills.manualInstall.subtitle":
    "Clone the repo and copy the skills",
  "aiWorkspace.skills.startWith":
    "Start with <cmd>/seo-project-setup</cmd>. It will ask about your project and help configure your workspace.",
  "aiWorkspace.skills.availableHeading": "Available skills",

  // Available tools section. `<AvailableTools />` (features/ai-mcp, out of
  // this catalog's scope) renders its own tool names and descriptions
  // verbatim in English on purpose: they are the same strings the MCP server
  // advertises to agents over the protocol, so only the section chrome
  // around that component needs an id here.
  "aiWorkspace.availableTools.heading": "Available tools",

  // Open-source workflow reference section
  "aiWorkspace.openSource.heading": "Open-source workflow reference",
  "aiWorkspace.openSource.body":
    "Sam is a separate upstream experiment for content workflows. EchoSEO keeps attribution here while its own in-app assisted workspace is developed independently.",
  "aiWorkspace.openSource.link": "View upstream reference",

  // Roadmap section
  "aiWorkspace.roadmap.heading": "Roadmap",
  "aiWorkspace.roadmap.researchAgent.title": "In-app SEO Research Agent",
  "aiWorkspace.roadmap.researchAgent.description":
    "Ask questions and run research without leaving EchoSEO",
  "aiWorkspace.roadmap.contentAssistant.title": "Content Assistant",
  "aiWorkspace.roadmap.contentAssistant.description":
    "Generate drafts using saved keywords and business context",

  // Footer
  "aiWorkspace.footer.feedback":
    "Have feedback? Reach out on <discordLink>Discord</discordLink> or email <emailLink>{email}</emailLink>.",

  // features/assistant-workspace/AssistantWorkspacePage.tsx. The eyebrow
  // above the <h1> reuses `nav.assistantWorkspace` ("AI Workspace") so it
  // cannot drift from the sidebar label; the <h1> itself carries more
  // specific copy and gets its own id below.
  "aiWorkspace.workspace.unavailable":
    "We could not open this private assistant workspace.",
  "aiWorkspace.workspace.title": "Assisted SEO workflows",
  "aiWorkspace.workspace.privateTo": "Private to you inside {projectName}.",
  "aiWorkspace.workspace.mcpSetupLink": "MCP setup",
  "aiWorkspace.workspace.setupRequired.title": "AI setup required",
  "aiWorkspace.workspace.setupRequired.hostedReason":
    "Hosted AI workspace is not available yet.",
  "aiWorkspace.workspace.setupRequired.missingKeyReason":
    "Add an OPENROUTER_API_KEY to enable the private AI workspace.",
  "aiWorkspace.workspace.setupRequired.openLink": "Open MCP and AI setup",

  // features/assistant-workspace/AssistantWorkspaceConversation.tsx
  "aiWorkspace.conversation.suggestion.workflow":
    "Create a focused 30-day SEO workflow for this project.",
  "aiWorkspace.conversation.suggestion.evidence":
    "What evidence should I inspect before choosing new keywords?",
  "aiWorkspace.conversation.suggestion.remediation":
    "Turn an audit finding into a safe remediation workflow.",
  "aiWorkspace.conversation.disclaimer":
    "<b>Assisted and read-only.</b> Nothing here publishes, changes settings, starts jobs, or spends data-provider credits.",
  "aiWorkspace.conversation.emptyState.title": "Build a safer SEO workflow",
  "aiWorkspace.conversation.emptyState.body":
    "Ask for a plan, decision framework, or a way to interpret existing EchoSEO evidence. You remain in control of every action.",
  "aiWorkspace.conversation.preparing": "Preparing the workflow…",
  "aiWorkspace.conversation.connectionError":
    "The assistant connection failed. Refresh the page and try again.",
  "aiWorkspace.conversation.composer.label": "Ask the workflow assistant",
  "aiWorkspace.conversation.composer.placeholder": "Ask for an SEO workflow…",
  "aiWorkspace.conversation.composer.send": "Send",
  // The shared copy control in features/ai-mcp/SetupControls.tsx. It renders on
  // this page, in the setup guides and in the skills section, so its copy lives
  // here once rather than as three English literals in a directory the prose
  // gate never scanned.
  "aiWorkspace.copy.action": "Copy",
  "aiWorkspace.copy.ariaLabel": "Copy",
  "aiWorkspace.copy.copiedToClipboard": "Copied to clipboard",
  "aiWorkspace.copy.clipboardUnavailable": "Clipboard not available",
  "aiWorkspace.copy.failed": "Could not copy to clipboard",
} as const;
