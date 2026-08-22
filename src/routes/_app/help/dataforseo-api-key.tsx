import { createFileRoute, Link } from "@tanstack/react-router";
import { FormattedMessage, useIntl } from "react-intl";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

// Literal text a reader has to match verbatim against something outside this
// page — a terminal command they type themselves, or the exact API response
// DataForSEO returns. Kept as plain constants (not catalog entries) so it can
// never be accidentally "translated" by a future edit to messages/vi: see
// messages/en/helpSupport.ts for the full reasoning.
const BASE64_ENCODE_COMMAND = "printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64";
const WRANGLER_SECRET_COMMAND = "npx wrangler secret put";
const ACCOUNT_NOT_READY_API_MESSAGE =
  "Please verify your account before using the API";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  const intl = useIntl();
  const envVar = <code>DATAFORSEO_API_KEY</code>;
  // Sourced from the shipped ids rather than retyped, so this page can never
  // point at a Settings heading or a DataForSEO section name that Settings
  // itself has since renamed (see seo-credentials/DataForSeoKeyCard.tsx,
  // which owns both).
  const settingsLabel = intl.formatMessage({ id: "account.settings" });
  const sectionLabel = intl.formatMessage({ id: "seoProvider.section" });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h1 className="text-2xl font-semibold">
              <FormattedMessage id="helpSupport.apiKey.title" />
            </h1>
            <p className="text-sm text-base-content/70">
              <FormattedMessage
                id="helpSupport.apiKey.intro"
                values={{ envVar }}
              />
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">
              <FormattedMessage id="helpSupport.apiKey.steps.heading" />
            </h2>
            <ol className="list-decimal pl-5 text-sm space-y-3 text-base-content/80">
              <li>
                <FormattedMessage
                  id="helpSupport.apiKey.steps.requestAccess"
                  values={{
                    link: (chunks) => (
                      <a
                        className="link link-primary"
                        href={DATAFORSEO_API_ACCESS_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {chunks}
                      </a>
                    ),
                  }}
                />
              </li>
              <li>
                <FormattedMessage id="helpSupport.apiKey.steps.encodeIntro" />
                <pre className="mt-2 p-3 rounded bg-base-200 border border-base-300 overflow-x-auto text-xs">
                  <code>{BASE64_ENCODE_COMMAND}</code>
                </pre>
              </li>
              <li>
                <FormattedMessage
                  id="helpSupport.apiKey.steps.saveSecret"
                  values={{ envVar }}
                />
              </li>
            </ol>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 text-sm text-base-content/75">
            <h2 className="card-title text-base">
              <FormattedMessage
                id="helpSupport.apiKey.settings.heading"
                values={{ settingsLabel }}
              />
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-base-content/80">
              <li>
                <FormattedMessage
                  id="helpSupport.apiKey.settings.openSettings"
                  values={{
                    settingsLabel,
                    link: (chunks) => (
                      <Link to="/settings" className="link link-primary">
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </li>
              <li>
                <FormattedMessage
                  id="helpSupport.apiKey.settings.findSection"
                  values={{
                    sectionLabel,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  }}
                />
              </li>
              <li>
                <FormattedMessage id="helpSupport.apiKey.settings.pasteValue" />
              </li>
            </ol>

            <div className="divider my-1" />

            <p>
              <FormattedMessage
                id="helpSupport.apiKey.settings.selfHosted"
                values={{
                  envVar,
                  command: <code>{WRANGLER_SECRET_COMMAND}</code>,
                }}
              />
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 text-sm text-base-content/75">
            <h2 className="card-title text-base">
              <FormattedMessage id="helpSupport.apiKey.slowActivation.heading" />
            </h2>
            <p>
              <FormattedMessage
                id="helpSupport.apiKey.slowActivation.body"
                values={{
                  errorCode: <code>40104</code>,
                  apiMessage: <em>{ACCOUNT_NOT_READY_API_MESSAGE}</em>,
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="helpSupport.apiKey.slowActivation.reassurance"
                values={{ settingsLabel }}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
