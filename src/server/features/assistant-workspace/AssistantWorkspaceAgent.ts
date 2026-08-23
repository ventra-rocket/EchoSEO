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
import {
  assistantGateReply,
  buildSystemPrompt,
} from "@/server/features/assistant-workspace/assistantPrompt";
import { chatLocaleSchema } from "@/shared/chat-locale";

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
    // Resolved before the gates below, because both of them answer the reader.
    const locale = chatLocaleSchema.parse(options?.body?.locale);
    const project = await ProjectRepository.getProjectById(identity.projectId);
    if (!project) return new Response("Project not found", { status: 404 });
    if (await isHostedServerAuthMode()) {
      return staticAssistantResponse(
        assistantGateReply("hostedUnavailable", locale),
      );
    }
    if (!(await getOptionalEnvValue("OPENROUTER_API_KEY"))) {
      return staticAssistantResponse(assistantGateReply("keyMissing", locale));
    }

    const result = streamText({
      model: await getOnboardingModel(),
      system: buildSystemPrompt(project.domain, locale),
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
