import { useEffect, useState } from "react";
import { FREE_SEO_CHECK_CONFIG_PATH } from "@/shared/free-seo-check";

/**
 * Loads the public Turnstile key from the running Worker instead of the build
 * environment. The key is intentionally public; the corresponding secret
 * never leaves the Worker.
 */
export function useTurnstileSiteKey(): string | null | undefined {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    void fetch(FREE_SEO_CHECK_CONFIG_PATH)
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load public configuration");
        const data = await response.json<{ turnstileSiteKey?: unknown }>();
        return typeof data.turnstileSiteKey === "string"
          ? data.turnstileSiteKey
          : null;
      })
      .then((configuredSiteKey) => {
        if (active) setSiteKey(configuredSiteKey);
      })
      .catch(() => {
        if (active) setSiteKey(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return siteKey;
}
