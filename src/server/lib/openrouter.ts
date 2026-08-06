import {
  createOpenRouter,
  type LanguageModelV3,
} from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
} from "@/server/lib/runtime-env";

// OpenRouter model slug used for the onboarding chat. Override
// with OPENROUTER_MODEL to swap models without a code change.
const DEFAULT_ONBOARDING_MODEL = "minimax/minimax-m3";

/**
 * Returns the AI SDK LanguageModel for onboarding. `usage: { include: true }`
 * turns on OpenRouter usage accounting so each response carries its real USD
 * cost (providerMetadata.openrouter.usage.cost) — which we meter against the
 * shared usage-credit pool. `provider.order` pins routing to Together first,
 * falling back to Atlas Cloud (fp8); `allow_fallbacks: false` keeps routing to
 * exactly those two so we get consistent behavior/pricing for the model.
 *
 * `reasoning` turns on OpenRouter's reasoning-token channel so the model's
 * chain-of-thought comes back as a separate reasoning stream instead of
 * leaking into the visible answer text (MiniMax M3 otherwise dumps its
 * `<think>` trace inline). `effort: "low"` keeps the trace — and its billable
 * tokens — short for the onboarding preview while still giving the UI a
 * "thinking" stream to show.
 */
export async function getOnboardingModel(): Promise<LanguageModelV3> {
  const apiKey = await getRequiredEnvValue("OPENROUTER_API_KEY");
  const modelId =
    (await getOptionalEnvValue("OPENROUTER_MODEL")) ?? DEFAULT_ONBOARDING_MODEL;
  return createOpenRouter({ apiKey })(modelId, {
    usage: { include: true },
    reasoning: { effort: "low" },
    provider: {
      order: ["together", "atlas-cloud/fp8"],
      allow_fallbacks: false,
    },
  });
}

// Model for the audit issue explainer. Separate slug from the onboarding
// override so tuning the chat model cannot silently change what the audit
// panel costs or how it writes.
const DEFAULT_EXPLAINER_MODEL = "minimax/minimax-m3";

/**
 * Returns the model for the audit issue explanation panel, or **null when
 * OpenRouter is not configured**.
 *
 * Null rather than a throw: the panel is an optional layer over deterministic,
 * already-cited fix steps, and a self-hosted deployment without a key must get
 * an issue page that is simply missing the commentary — not an error.
 *
 * Deliberately not `getOnboardingModel`. That one pins `provider.order` and
 * turns on a reasoning channel tuned for a streamed chat persona; this call
 * wants a few short structured sentences, and paying for a chain-of-thought
 * trace nobody renders would be waste. `usage: { include: true }` is kept —
 * the credit metering reads the real USD cost off that.
 */
export async function getIssueExplainerModel(): Promise<LanguageModelV3 | null> {
  // Optional OpenAI-compatible endpoint override (e.g. NVIDIA NIM hosting GLM):
  // when AI_EXPLAINER_BASE_URL + _API_KEY + _MODEL are ALL set, the explainer
  // talks to that endpoint instead of OpenRouter. A generic OpenAI-compatible
  // provider reports no usage cost, so metering reads 0 for it — acceptable
  // while the explainer runs on a free / self-paid key. generateExplanation()
  // swallows any error to null, so an endpoint lacking structured-output support
  // degrades to "no commentary", never a 500.
  const compatBaseUrl = await getOptionalEnvValue("AI_EXPLAINER_BASE_URL");
  const compatApiKey = await getOptionalEnvValue("AI_EXPLAINER_API_KEY");
  const compatModel = await getOptionalEnvValue("AI_EXPLAINER_MODEL");
  if (compatBaseUrl && compatApiKey && compatModel) {
    return createOpenAICompatible({
      name: "ai-explainer",
      baseURL: compatBaseUrl,
      apiKey: compatApiKey,
    }).chatModel(compatModel);
  }

  const apiKey = await getOptionalEnvValue("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  const modelId =
    (await getOptionalEnvValue("OPENROUTER_EXPLAINER_MODEL")) ??
    DEFAULT_EXPLAINER_MODEL;
  return createOpenRouter({ apiKey })(modelId, { usage: { include: true } });
}
