import { createFileRoute, Link } from "@tanstack/react-router";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h1 className="text-2xl font-semibold">
              Set up your DataForSEO API key
            </h1>
            <p className="text-sm text-base-content/70">
              EchoSEO needs the <code>DATAFORSEO_API_KEY</code> secret before
              keyword, domain, and SEO data workflows can run.
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">Steps</h2>
            <ol className="list-decimal pl-5 text-sm space-y-3 text-base-content/80">
              <li>
                Go to{" "}
                <a
                  className="link link-primary"
                  href={DATAFORSEO_API_ACCESS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  DataForSEO API Access
                </a>{" "}
                and request API credentials by email.
              </li>
              <li>
                Base64 encode your DataForSEO login and API password in this
                format:
                <pre className="mt-2 p-3 rounded bg-base-200 border border-base-300 overflow-x-auto text-xs">
                  <code>printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64</code>
                </pre>
              </li>
              <li>
                Save the output as the <code>DATAFORSEO_API_KEY</code> secret in
                your environment.
              </li>
            </ol>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 text-sm text-base-content/75">
            <h2 className="card-title text-base">Add the key in Settings</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-base-content/80">
              <li>
                Open{" "}
                <Link to="/settings" className="link link-primary">
                  Settings
                </Link>
                .
              </li>
              <li>
                Find the <strong>DataForSEO API Key</strong> card.
              </li>
              <li>
                Paste the base64 value from the terminal command above and save.
              </li>
            </ol>

            <div className="divider my-1" />

            <p>
              Self-hosting? Set the <code>DATAFORSEO_API_KEY</code> secret
              instead — see <code>npx wrangler secret put</code> in your
              deployment docs.
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 text-sm text-base-content/75">
            <h2 className="card-title text-base">
              A new account may not answer straight away
            </h2>
            <p>
              A brand-new DataForSEO account can take about a day before its API
              starts answering, even once you have finished the email
              verification step. Until it does, every data request comes back as{" "}
              <code>40104</code> —{" "}
              <em>Please verify your account before using the API</em> — while
              the DataForSEO dashboard shows nothing wrong.
            </p>
            <p>
              This is not a problem with your key, and there is nothing to fix
              on the EchoSEO side. Saving the key in Settings tells you which
              state you are in: a wrong key is rejected outright, while a good
              key on an account that is not serving yet is saved with a note
              saying so. Try again later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
