import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import {
  createRankTrackingConfig,
  updateRankTrackingConfig,
} from "@/serverFunctions/rank-tracking";
import { Loader2, X } from "lucide-react";
import { Modal } from "@/client/components/Modal";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import { domainField, normalizeDomain } from "@/types/schemas/domain";
import {
  DEFAULT_LOCATION_CODE,
  getLanguageCode,
  getLanguageOptions,
} from "@/client/features/keywords/locations";
import { LocationSelect } from "@/client/components/LocationSelect";
import { KeywordSuggestionStep } from "./KeywordSuggestionStep";
import { CostEstimateNote } from "./CostEstimateNote";
import {
  DevicesField,
  ScheduleFieldGroup,
  DepthField,
} from "./RankTrackingConfigFields";

type Props = {
  projectId: string;
  existingConfig?: RankTrackingConfig | null;
  onClose: () => void;
  onSaved: (createdConfigId?: string) => void;
  onConfigCreated?: () => void;
};

export function RankTrackingConfigModal({
  projectId,
  existingConfig,
  onClose,
  onSaved,
  onConfigCreated,
}: Props) {
  const intl = useIntl();
  const isEdit = !!existingConfig;
  const [step, setStep] = useState<"config" | "keywords">("config");
  const [domain, setDomain] = useState(existingConfig?.domain ?? "");
  const [devices, setDevices] = useState<"both" | "desktop" | "mobile">(
    existingConfig?.devices ?? "mobile",
  );
  const [locationCode, setLocationCode] = useState(
    existingConfig?.locationCode ?? DEFAULT_LOCATION_CODE,
  );
  const [languageCode, setLanguageCode] = useState(
    existingConfig?.languageCode ??
      getLanguageCode(existingConfig?.locationCode ?? DEFAULT_LOCATION_CODE),
  );
  const languageOptions = useMemo(
    () => getLanguageOptions(locationCode),
    [locationCode],
  );
  const [serpDepth, setSerpDepth] = useState(existingConfig?.serpDepth ?? 40);
  const [schedule, setSchedule] = useState<
    RankTrackingConfig["scheduleInterval"]
  >(existingConfig?.scheduleInterval ?? "weekly");
  const [scheduledEnabled, setScheduledEnabled] = useState(
    existingConfig?.scheduledEnabled ?? false,
  );
  const [createdConfigId, setCreatedConfigId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (normalizedDomain: string) =>
      createRankTrackingConfig({
        data: {
          projectId,
          domain: normalizedDomain,
          devices,
          serpDepth,
          locationCode,
          languageCode,
          scheduleInterval: schedule,
        },
      }),
    onSuccess: (result) => {
      captureClientEvent("rank_tracking:config_create");
      toast.success(
        intl.formatMessage({ id: "rank.config.form.createSuccessToast" }),
      );
      setCreatedConfigId(result.configId);
      onConfigCreated?.();
      setStep("keywords");
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(
          error,
          intl.formatMessage({ id: "rank.config.form.createErrorDefault" }),
        ),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (normalizedDomain: string) =>
      updateRankTrackingConfig({
        data: {
          projectId,
          configId: existingConfig!.id,
          domain: normalizedDomain,
          devices,
          serpDepth,
          locationCode,
          languageCode,
          scheduleInterval: schedule,
          // A manual config has no schedule for the cron to follow, so switching
          // to it retires the opt-in too. Leaving a stale `true` behind would let
          // a later switch back to an interval resume automatic spending without
          // the owner opting in again.
          scheduledEnabled: schedule === "manual" ? false : scheduledEnabled,
        },
      }),
    onSuccess: () => {
      captureClientEvent("rank_tracking:config_update");
      toast.success(
        intl.formatMessage({ id: "rank.config.form.updateSuccessToast" }),
      );
      onSaved();
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(
          error,
          intl.formatMessage({ id: "rank.config.form.updateErrorDefault" }),
        ),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!domain.trim()) {
      toast.error(
        intl.formatMessage({ id: "rank.config.form.domainRequiredToast" }),
      );
      return;
    }
    const parsedDomain = domainField.safeParse(domain);
    if (!parsedDomain.success) {
      toast.error(
        intl.formatMessage({ id: "rank.config.form.domainInvalidToast" }),
      );
      return;
    }
    setDomain(parsedDomain.data);
    if (isEdit) {
      updateMutation.mutate(parsedDomain.data);
    } else {
      createMutation.mutate(parsedDomain.data);
    }
  };

  const handleDomainBlur = () => {
    try {
      setDomain(normalizeDomain(domain));
    } catch {
      // Keep invalid partial input editable; submit validation will show the error.
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (step === "keywords" && createdConfigId) {
    const closeKeywordStep = () => onSaved(createdConfigId);

    return (
      <Modal
        maxWidth="max-w-3xl"
        onClose={closeKeywordStep}
        labelledBy="keyword-suggestions-title"
      >
        <KeywordSuggestionStep
          configId={createdConfigId}
          projectId={projectId}
          domain={domain}
          locationCode={locationCode}
          languageCode={languageCode}
          onDone={(id) => onSaved(id)}
          onClose={closeKeywordStep}
        />
      </Modal>
    );
  }

  return (
    <Modal
      maxWidth="max-w-lg"
      onClose={onClose}
      labelledBy="rank-config-modal-title"
    >
      <div className="flex items-center justify-between">
        <h2 id="rank-config-modal-title" className="text-lg font-semibold">
          <FormattedMessage
            id={
              isEdit
                ? "rank.config.modal.editTitle"
                : "rank.config.action.addDomain"
            }
          />
        </h2>
        <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              <FormattedMessage id="rank.config.form.domainLabel" />
            </span>
          </label>
          <input
            type="text"
            placeholder={intl.formatMessage({
              id: "rank.config.form.domainPlaceholder",
            })}
            className="input input-bordered w-full"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onBlur={handleDomainBlur}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              <FormattedMessage id="rank.config.form.countryLabel" />
            </span>
          </label>
          <LocationSelect
            value={locationCode}
            onChange={(newLocationCode) => {
              setLocationCode(newLocationCode);
              setLanguageCode(getLanguageCode(newLocationCode));
            }}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              <FormattedMessage id="rank.config.form.languageLabel" />
            </span>
          </label>
          <select
            className="select select-bordered w-full"
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            disabled={languageOptions.length <= 1}
          >
            {languageOptions.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <DevicesField devices={devices} onChange={setDevices} />

        <ScheduleFieldGroup
          schedule={schedule}
          onScheduleChange={setSchedule}
          isEdit={isEdit}
          scheduledEnabled={scheduledEnabled}
          onScheduledEnabledChange={setScheduledEnabled}
        />

        <DepthField serpDepth={serpDepth} onChange={setSerpDepth} />

        <CostEstimateNote
          devices={devices}
          serpDepth={serpDepth}
          schedule={schedule}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            <FormattedMessage id="rank.config.action.cancel" />
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending || !domain.trim()}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            <FormattedMessage
              id={
                isEdit
                  ? "rank.config.modal.saveChanges"
                  : "rank.config.action.addDomain"
              }
            />
          </button>
        </div>
      </form>
    </Modal>
  );
}
