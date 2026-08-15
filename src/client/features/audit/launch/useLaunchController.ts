import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteAudit,
  getAuditAccess,
  getAuditHistory,
  startAudit,
} from "@/serverFunctions/audit";
import {
  DEFAULT_LAUNCH_FORM_VALUES,
  LARGE_CRAWL_CONFIRM_PAGES,
  MAX_PAGES_LIMIT,
  MIN_PAGES,
  type LaunchFormValues,
  type LaunchRequest,
} from "@/client/features/audit/launch/types";
import { evaluateLaunchVerificationGate } from "@/client/features/audit/launch/verification";
import {
  createFormValidationErrors,
  shouldValidateFieldOnChange,
} from "@/client/lib/forms";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

function getLaunchValidationErrors(
  value: LaunchFormValues,
  shouldValidateUntouchedField: boolean,
) {
  if (value.url.trim()) {
    return null;
  }

  if (!shouldValidateUntouchedField) {
    return null;
  }

  return createFormValidationErrors({
    fields: {
      url: "Please enter a URL.",
    },
  });
}

export function useLaunchController({
  projectId,
  onAuditStarted,
}: {
  projectId: string;
  onAuditStarted: (auditId: string) => void;
}) {
  // A launch waiting on the large-crawl confirmation. Held as the exact request
  // rather than re-read from the form on confirm, so what the user confirmed is
  // what runs.
  const [pendingLaunch, setPendingLaunch] = useState<LaunchRequest | null>(
    null,
  );
  const historyQuery = useQuery({
    queryKey: ["audit-history", projectId],
    queryFn: () => getAuditHistory({ data: { projectId } }),
  });
  const accessQuery = useQuery({
    queryKey: ["audit-access", projectId],
    queryFn: () => getAuditAccess({ data: { projectId } }),
  });
  const { startMutation, deleteMutation } = useLaunchMutations({
    projectId,
    historyRefetch: historyQuery.refetch,
  });

  // Hoisted, so `onSubmit` below can call it and it can still read `launchForm`.
  async function runLaunch(request: LaunchRequest) {
    try {
      const result = await startMutation.mutateAsync(request);
      toast.success("Audit started!");
      onAuditStarted(result.auditId);
    } catch (error) {
      launchForm.setErrorMap({
        onSubmit: createFormValidationErrors({
          form: getStandardErrorMessage(error, "Failed to start audit"),
        }),
      });
    }
  }

  const launchForm = useForm({
    defaultValues: DEFAULT_LAUNCH_FORM_VALUES,
    validators: {
      onChange: ({ formApi, value }) =>
        getLaunchValidationErrors(
          value,
          shouldValidateFieldOnChange(formApi, "url"),
        ),
      onSubmit: ({ value }) => getLaunchValidationErrors(value, true),
    },
    onSubmit: async ({ formApi, value }) => {
      const effectiveMaxPages = commitMaxPagesInput(launchForm);
      formApi.setErrorMap({ onSubmit: undefined });

      const request: LaunchRequest = {
        projectId,
        startUrl: value.url,
        maxPages: effectiveMaxPages,
        lighthouseStrategy: value.runLighthouse ? "auto" : "none",
      };

      if (effectiveMaxPages > LARGE_CRAWL_CONFIRM_PAGES) {
        setPendingLaunch(request);
        return;
      }

      await runLaunch(request);
    },
  });

  const values = useStore(launchForm.store, (state) => state.values);
  const verificationGate = evaluateLaunchVerificationGate({
    urlInput: values.url,
    maxPages: Number.parseInt(values.maxPagesInput, 10),
    access: accessQuery.data,
  });

  return {
    launchForm,
    historyQuery,
    accessQuery,
    verificationGate,
    pendingLaunch,
    isStarting: startMutation.isPending,
    commitMaxPagesInput: () => commitMaxPagesInput(launchForm),
    // One click out of a blocked launch: crawl this domain at the size an
    // unverified domain is allowed, rather than leaving the user to work out
    // which number the message meant.
    applyVerificationPageLimit: () => {
      if (!verificationGate) return;
      launchForm.setFieldValue(
        "maxPagesInput",
        String(verificationGate.threshold),
      );
    },
    confirmPendingLaunch: async () => {
      if (!pendingLaunch) return;
      await runLaunch(pendingLaunch);
      setPendingLaunch(null);
    },
    cancelPendingLaunch: () => setPendingLaunch(null),
    deleteAudit: (auditId: string) => deleteMutation.mutate(auditId),
  };
}

function useLaunchMutations({
  projectId,
  historyRefetch,
}: {
  projectId: string;
  historyRefetch: () => Promise<unknown>;
}) {
  const startMutation = useMutation({
    mutationFn: (data: LaunchRequest) => startAudit({ data }),
  });

  const deleteMutation = useMutation({
    mutationFn: (auditId: string) =>
      deleteAudit({ data: { projectId, auditId } }),
    onSuccess: () => {
      void historyRefetch();
      toast.success("Audit deleted");
    },
  });

  return { startMutation, deleteMutation };
}

function commitMaxPagesInput(launchForm: {
  state: { values: { maxPagesInput: string } };
  setFieldValue: (field: "maxPagesInput", value: string) => void;
}) {
  const maxPagesInput = launchForm.state.values.maxPagesInput;
  const value = maxPagesInput ? Number.parseInt(maxPagesInput, 10) : MIN_PAGES;
  const safeValue = Number.isFinite(value)
    ? Math.max(MIN_PAGES, Math.min(MAX_PAGES_LIMIT, Math.round(value)))
    : MIN_PAGES;
  launchForm.setFieldValue("maxPagesInput", String(safeValue));
  return safeValue;
}
