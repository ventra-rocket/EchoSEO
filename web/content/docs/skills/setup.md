---
title: "Set up EchoSEO Agent Skills"
description: "Add EchoSEO skill files to your AI agent after connecting EchoSEO MCP."
---

EchoSEO Agent Skills are separate files from EchoSEO MCP.

First, [set up EchoSEO MCP](/docs/mcp). MCP gives your agent access to EchoSEO data.

Then add the EchoSEO `SKILL.md` files you want your agent to use. Each skill gives your agent one SEO workflow.

## Choose an installation option

Pick the option that matches how you want to install the files.

### Option 1: Install and choose interactively

Use this if you want the installer to show the available skills and agents.

```bash
npx skills add ventra-rocket/EchoSEO
```

### Option 2: Install all EchoSEO skills

Use this if you want every EchoSEO skill.

```bash
npx skills add ventra-rocket/EchoSEO --skill '*'
```

### Option 3: Install all skills for Claude Code only

Use this if the skills should be available in Claude Code only.

```bash
npx skills add ventra-rocket/EchoSEO --skill '*' --agent claude-code
```

### Option 4: Install all skills for OpenAI Codex only

Use this if the skills should be available in Codex only.

```bash
npx skills add ventra-rocket/EchoSEO --skill '*' --agent codex
```

### Option 5: Copy the skill files manually

Use this if you prefer to copy files into your agent's skills folder.

```bash
git clone https://github.com/ventra-rocket/EchoSEO.git

# Codex
mkdir -p ~/.codex/skills
cp -R EchoSEO/.agents/skills/* ~/.codex/skills/

# Claude Code
mkdir -p ~/.claude/skills
cp -R EchoSEO/.agents/skills/* ~/.claude/skills/
```

You can also review the source skills on GitHub:

- [EchoSEO Agent Skills on GitHub](https://github.com/ventra-rocket/EchoSEO/tree/main/.agents/skills)

Each skill page also links to its source `SKILL.md`.

## Run a skill

After the skill files are available to your agent, run the matching slash command:

- `/seo-project-setup`
- `/seo-coach`
- `/keyword-research`
- `/keyword-clustering`
- `/competitive-landscape`
- `/competitor-analysis`
- `/link-prospecting`

## Next step

Start with [SEO Project Setup](/docs/skills/seo-project-setup) if this is a new SEO project, or [SEO Coach](/docs/skills/seo-coach) if you are not sure which workflow to run first.
