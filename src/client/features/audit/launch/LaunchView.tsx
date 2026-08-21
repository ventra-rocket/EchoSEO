import { FormattedMessage } from "react-intl";
import { AuditHistorySection } from "@/client/features/audit/launch/AuditHistorySection";
import { LargeCrawlConfirmModal } from "@/client/features/audit/launch/LargeCrawlConfirmModal";
import { LaunchFormCard } from "@/client/features/audit/launch/LaunchFormCard";
import { useLaunchController } from "@/client/features/audit/launch/useLaunchController";

export function LaunchView({
  projectId,
  onAuditStarted,
}: {
  projectId: string;
  onAuditStarted: (auditId: string) => void;
}) {
  const controller = useLaunchController({ projectId, onAuditStarted });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">
          <FormattedMessage id="audit.chrome.heading" />
        </h1>

        <LaunchFormCard
          launchForm={controller.launchForm}
          commitMaxPagesInput={controller.commitMaxPagesInput}
          access={controller.accessQuery.data}
          verificationGate={controller.verificationGate}
          onUseVerificationLimit={controller.applyVerificationPageLimit}
        />

        <AuditHistorySection
          projectId={projectId}
          history={controller.historyQuery.data ?? []}
          isLoading={controller.historyQuery.isLoading}
          onDelete={controller.deleteAudit}
          canDelete={controller.accessQuery.data?.canLaunch ?? true}
        />

        {controller.pendingLaunch ? (
          <LargeCrawlConfirmModal
            maxPages={controller.pendingLaunch.maxPages}
            startUrl={controller.pendingLaunch.startUrl}
            isStarting={controller.isStarting}
            onConfirm={() => void controller.confirmPendingLaunch()}
            onCancel={controller.cancelPendingLaunch}
          />
        ) : null}
      </div>
    </div>
  );
}
