import { Loader2 } from "lucide-react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { useSeoApiKeyStatus } from "@/client/features/access-gate/useSeoApiKeyStatus";
import {
  MAX_PAGES_LIMIT,
  MIN_PAGES,
} from "@/client/features/audit/launch/types";
import type { useLaunchController } from "@/client/features/audit/launch/useLaunchController";
import type { LaunchVerificationGate } from "@/client/features/audit/launch/verification";
import { getFieldError, getFormError } from "@/client/lib/forms";

/** Referenced by the submit button, so a disabled launch states its own reason. */
const VERIFICATION_NOTE_ID = "audit-launch-verification-note";

type Props = {
  launchForm: ReturnType<typeof useLaunchController>["launchForm"];
  commitMaxPagesInput: () => number;
};

type AuditAccess = NonNullable<
  ReturnType<typeof useLaunchController>["accessQuery"]["data"]
>;

export function LaunchFormCard({
  commitMaxPagesInput,
  launchForm,
  access,
  verificationGate,
  onUseVerificationLimit,
}: Props & {
  access: AuditAccess | undefined;
  verificationGate: LaunchVerificationGate | null;
  onUseVerificationLimit: () => void;
}) {
  // Until access resolves, assume the caller may launch: the server is the
  // authority and rejects a viewer anyway, and a flashing disabled button on
  // every load is worse than a request that fails for the rare read-only user.
  const canLaunch = access?.canLaunch ?? true;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <h2 className="card-title text-base">
          <FormattedMessage id="audit.chrome.launch.title" />
        </h2>

        {canLaunch ? null : (
          <div className="alert alert-info py-2">
            <span className="text-sm">
              <FormattedMessage id="audit.chrome.launch.readOnlyNotice" />
            </span>
          </div>
        )}

        <form
          className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void launchForm.handleSubmit();
          }}
        >
          <launchForm.Field name="url">
            {(field) => {
              const urlError = getFieldError(field.state.meta.errors);

              return (
                <label
                  className={`input input-bordered w-full lg:col-span-9 ${urlError ? "input-error" : ""}`}
                >
                  <input
                    placeholder="https://example.com"
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (launchForm.state.errorMap.onSubmit) {
                        launchForm.setErrorMap({ onSubmit: undefined });
                      }
                    }}
                  />
                </label>
              );
            }}
          </launchForm.Field>

          <launchForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                className="btn btn-primary btn-sm w-full lg:col-span-3"
                disabled={
                  isSubmitting || !canLaunch || verificationGate !== null
                }
                aria-describedby={
                  verificationGate ? VERIFICATION_NOTE_ID : undefined
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />{" "}
                    <FormattedMessage id="audit.chrome.launch.submitStarting" />
                  </>
                ) : (
                  <FormattedMessage id="audit.chrome.launch.submit" />
                )}
              </button>
            )}
          </launchForm.Subscribe>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-12 lg:items-start">
            <LaunchOptions
              launchForm={launchForm}
              commitMaxPagesInput={commitMaxPagesInput}
            />
            <LighthouseOptions launchForm={launchForm} />
          </div>
        </form>

        <VerificationNote
          access={access}
          gate={verificationGate}
          onUseVerificationLimit={onUseVerificationLimit}
        />
        <LaunchErrors launchForm={launchForm} />
      </div>
    </div>
  );
}

function LaunchOptions({ launchForm, commitMaxPagesInput }: Props) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/20 p-3 space-y-2">
      <label className="text-xs font-medium uppercase tracking-wide text-base-content/60">
        <FormattedMessage id="audit.chrome.launch.crawlLimitLabel" />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-base-content/70">
          <FormattedMessage id="audit.chrome.launch.maxPagesLabel" />
        </span>
        <launchForm.Field name="maxPagesInput">
          {(field) => (
            <input
              type="number"
              min={MIN_PAGES}
              max={MAX_PAGES_LIMIT}
              className="input input-bordered input-sm w-28"
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                if (!/^\d*$/.test(next)) return;
                field.handleChange(next);
                if (launchForm.state.errorMap.onSubmit) {
                  launchForm.setErrorMap({ onSubmit: undefined });
                }
              }}
              onBlur={commitMaxPagesInput}
            />
          )}
        </launchForm.Field>
      </div>
      <p className="text-xs text-base-content/50">
        <FormattedMessage
          id="audit.chrome.launch.pagesRangeHint"
          values={{ min: MIN_PAGES, max: MAX_PAGES_LIMIT }}
        />
      </p>
    </div>
  );
}

function LighthouseOptions({ launchForm }: Pick<Props, "launchForm">) {
  const intl = useIntl();
  // Lighthouse runs through DataForSEO, so a keyless org can't select it —
  // ticking it would just fail server-side once the run fires.
  const seoApiKeyStatus = useSeoApiKeyStatus();
  const seoApiKeyConfigured = seoApiKeyStatus.data?.configured === true;

  return (
    <div className="rounded-lg border border-base-300 bg-base-200/20 p-3 space-y-2">
      <label className="label cursor-pointer justify-start gap-2 p-0">
        <launchForm.Field name="runLighthouse">
          {(field) => (
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={Boolean(field.state.value)}
              disabled={!seoApiKeyConfigured}
              onChange={(event) => field.handleChange(event.target.checked)}
            />
          )}
        </launchForm.Field>
        <span
          className="text-sm font-medium text-base-content/80"
          title={intl.formatMessage({
            id: "audit.chrome.launch.lighthouseTooltip",
          })}
        >
          <FormattedMessage id="audit.chrome.launch.includeLighthouse" />
        </span>
      </label>

      {seoApiKeyConfigured ? (
        <launchForm.Subscribe
          selector={(snapshot) => snapshot.values.runLighthouse}
        >
          {(runLighthouse) =>
            runLighthouse ? (
              <div className="space-y-1">
                <p className="text-xs text-base-content/60">
                  <FormattedMessage id="audit.chrome.launch.lighthouseSampleNote" />
                </p>
              </div>
            ) : null
          }
        </launchForm.Subscribe>
      ) : (
        <p className="text-xs text-base-content/60">
          <FormattedMessage id="audit.chrome.launch.lighthouseNeedsKey" />
        </p>
      )}
    </div>
  );
}

/**
 * Explains the ownership rule before a large crawl is rejected for it, and names
 * the typed domain once that rule is about to refuse the launch. Only rendered
 * where the rule applies — self-host deployments have no threshold.
 */
function VerificationNote({
  access,
  gate,
  onUseVerificationLimit,
}: {
  access: AuditAccess | undefined;
  gate: LaunchVerificationGate | null;
  onUseVerificationLimit: () => void;
}) {
  if (!access?.verificationPageThreshold) {
    return null;
  }

  if (!gate) {
    return (
      <p id={VERIFICATION_NOTE_ID} className="text-xs text-base-content/60">
        {access.verifiedSiteUrl ? (
          <FormattedMessage
            id="audit.chrome.launch.verificationConnected"
            values={{
              url: access.verifiedSiteUrl,
              threshold: (
                <FormattedNumber value={access.verificationPageThreshold} />
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="audit.chrome.launch.verificationRequired"
            values={{
              threshold: (
                <FormattedNumber value={access.verificationPageThreshold} />
              ),
            }}
          />
        )}
      </p>
    );
  }

  const limit = <FormattedNumber value={gate.threshold} />;

  return (
    <div
      id={VERIFICATION_NOTE_ID}
      className="alert alert-warning items-start py-2"
    >
      <div className="space-y-2 text-sm">
        <p>
          {gate.verifiedSiteUrl ? (
            <FormattedMessage
              id="audit.chrome.launch.verificationGateMismatch"
              values={{
                domain: gate.domain,
                url: gate.verifiedSiteUrl,
                limit,
              }}
            />
          ) : (
            <FormattedMessage
              id="audit.chrome.launch.verificationGateNone"
              values={{ domain: gate.domain, limit }}
            />
          )}
        </p>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onUseVerificationLimit}
        >
          <FormattedMessage
            id="audit.chrome.launch.crawlLimitButton"
            values={{ limit }}
          />
        </button>
      </div>
    </div>
  );
}

function LaunchErrors({ launchForm }: Pick<Props, "launchForm">) {
  return (
    <div className="space-y-2">
      <launchForm.Field name="url">
        {(field) => {
          const urlError = getFieldError(field.state.meta.errors);

          return urlError ? (
            <p className="text-sm text-error">{urlError}</p>
          ) : null;
        }}
      </launchForm.Field>

      <launchForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(submitError) => {
          const errorMessage = getFormError(submitError);

          return errorMessage ? (
            <div className="alert alert-error py-2">
              <span className="text-sm">{errorMessage}</span>
            </div>
          ) : null;
        }}
      </launchForm.Subscribe>
    </div>
  );
}
