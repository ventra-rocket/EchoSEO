import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import type { OnChatMessageOptions } from "@cloudflare/ai-chat";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { getOnboardingModel } from "@/server/lib/openrouter";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { parseAssistantWorkspaceName } from "@/shared/assistant-workspace";

function buildSystemPrompt(domain: string | null) {
  return [
    "You are EchoSEO's in-app SEO workflow assistant.",
    "Help turn an SEO question into a concise, evidence-aware plan the user can carry out inside EchoSEO or through its MCP server.",
    "This is an assisted, read-only workspace. You cannot publish content, change settings, trigger an audit, spend provider credits, or claim live rankings. Never imply that you did any of those things.",
    "Do not invent metrics, rankings, Search Console results, keywords, competitors, or audit findings. When evidence is needed, tell the user which EchoSEO surface or MCP read tool to use next.",
    "Stay within SEO and EchoSEO. Lead with a direct answer, then use at most 5 concise bullets. Use Markdown but no decorative emoji.",
    "When useful, use: Goal, Evidence to inspect, Decision, and Safe next action. The safe next action must remain user-controlled.",
    domain
      ? `The current project domain is ${domain}.`
      : "This project has no configured domain yet. Ask the user to add one before site-specific advice.",
  ].join("\n\n");
}

function staticAssistantResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = crypto.randomUUID();
      writer.write({ type: "text-start", id });
      writer.write({
        type: "text-delta",
        id,
        delta: text,
      });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** Private per-project, per-user assisted-workflow transcript. */
export class AssistantWorkspaceAgent extends AIChatAgent {
  maxPersistedMessages = 80;

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: OnChatMessageOptions,
  ): Promise<Response | undefined> {
    const identity = parseAssistantWorkspaceName(this.name);
    if (!identity)
      return new Response("Invalid assistant workspace", { status: 400 });
    const project = await ProjectRepository.getProjectById(identity.projectId);
    if (!project) return new Response("Project not found", { status: 404 });
    if (await isHostedServerAuthMode()) {
      return staticAssistantResponse(
        "Hosted AI workspace is not available yet. This prevents unmanaged model spend while EchoSEO defines billing and usage limits for this surface.",
      );
    }
    if (!(await getOptionalEnvValue("OPENROUTER_API_KEY"))) {
      return staticAssistantResponse(
        "The AI workspace needs an `OPENROUTER_API_KEY` before it can respond. Add your bring-your-own key, then refresh this page.",
      );
    }

    const result = streamText({
      model: await getOnboardingModel(),
      system: buildSystemPrompt(project.domain),
      messages: await convertToModelMessages(this.messages),
      abortSignal: options?.abortSignal,
      maxOutputTokens: 1200,
      stopWhen: stepCountIs(2),
      onFinish,
    });
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("[assistant-workspace] chat stream error", error);
        return "The assistant could not complete that workflow. Please try again.";
      },
    });
  }
}
