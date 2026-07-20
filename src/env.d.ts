// Custom environment variable type definitions
// These extend the auto-generated Env interface from worker-configuration.d.ts

declare namespace Cloudflare {
  interface Env {
    R2: R2Bucket;
    OAUTH_KV: KVNamespace;

    // Durable Object backing the onboarding strategy chat (see wrangler.jsonc).
    ONBOARDING_CHAT: DurableObjectNamespace;

    AUTH_MODE?: "cloudflare_access" | "local_noauth" | "hosted";
    BYPASS_EMAIL_VERIFICATION?: string;
    TEAM_DOMAIN?: string;
    POLICY_AUD?: string;
    POSTHOG_PUBLIC_KEY?: string;
    POSTHOG_HOST?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    LOOPS_API_KEY?: string;
    LOOPS_TRANSACTIONAL_VERIFY_EMAIL_ID?: string;
    LOOPS_TRANSACTIONAL_RESET_PASSWORD_ID?: string;
    AUTUMN_SECRET_KEY?: string;
    AUTUMN_WEBHOOK_SECRET?: string;

    // Cloudflare Turnstile secret key for the public /free-seo-check widget.
    TURNSTILE_SECRET_KEY?: string;

    // Google PageSpeed Insights API key for the free Deep check (Lighthouse/CWV).
    GOOGLE_PSI_API_KEY?: string;

    // Free Deep check abuse/quota gates (all optional; conservative defaults in
    // deep-check-config.ts). Kill-switch = "true" pauses the whole pipeline.
    FREE_DEEP_CHECK_DISABLED?: string;
    DEEP_CHECK_PSI_DAILY_CEILING?: string;
    DEEP_CHECK_PER_DOMAIN_DAILY?: string;
    DEEP_CHECK_PER_EMAIL_DAILY?: string;

    // DataForSEO API Basic auth value (base64 of login:password)
    DATAFORSEO_API_KEY: string;

    // OpenRouter API key for the onboarding chat.
    OPENROUTER_API_KEY?: string;
    // Optional OpenRouter model slug override (defaults in openrouter.ts).
    OPENROUTER_MODEL?: string;
    // Optional model slug for the audit issue explainer, kept separate so
    // retuning the chat model cannot change the audit panel's cost or voice.
    OPENROUTER_EXPLAINER_MODEL?: string;
  }
}

interface ImportMetaEnv {
  readonly AUTH_MODE?: "cloudflare_access" | "local_noauth" | "hosted";
  readonly BYPASS_EMAIL_VERIFICATION?: string;
  readonly POSTHOG_PUBLIC_KEY?: string;
  readonly POSTHOG_HOST?: string;
  readonly VITE_E2E_DOMAIN_FIXTURES?: string;
  readonly VITE_E2E_KEYWORD_FIXTURES?: string;
  // Cloudflare Turnstile site key — public by design, baked in at build time.
  readonly TURNSTILE_SITE_KEY?: string;
  // Absolute public origin for canonical/OG/sitemap URLs. Overridable for forks;
  // defaults to the production domain when unset.
  readonly VITE_PUBLIC_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
