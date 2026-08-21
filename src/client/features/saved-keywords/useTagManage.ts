import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import {
  deleteSavedKeywordTag,
  updateSavedKeywordTag,
} from "@/serverFunctions/keywords";
import type { TagColorKey } from "@/shared/tag-colors";

export function useTagManage(projectId: string) {
  // A hook, not a plain function — calls useIntl() itself rather than taking
  // an IntlShape parameter, matching useLaunchController/useLaunchMutations
  // (src/client/features/audit/launch/useLaunchController.ts), which only
  // thread intl as a parameter into plain non-hook helpers that cannot call
  // useIntl() on their own.
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [busyTagIds, setBusyTagIds] = useState<Set<string>>(new Set());

  const markBusy = (tagId: string, busy: boolean) => {
    setBusyTagIds((current) => {
      const next = new Set(current);
      if (busy) next.add(tagId);
      else next.delete(tagId);
      return next;
    });
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["savedKeywords", projectId] });

  const updateTag = async (input: {
    tagId: string;
    name?: string;
    color?: TagColorKey | null;
  }) => {
    markBusy(input.tagId, true);
    try {
      await updateSavedKeywordTag({
        data: {
          projectId,
          tagId: input.tagId,
          name: input.name,
          color: input.color ?? undefined,
        },
      });
      await invalidate();
      toast.success(
        intl.formatMessage({ id: "saved.tagManage.updateSuccessToast" }),
      );
    } catch (error) {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "saved.tagManage.updateErrorFallback" }),
        ),
      );
    } finally {
      markBusy(input.tagId, false);
    }
  };

  const deleteTag = async (tagId: string): Promise<boolean> => {
    markBusy(tagId, true);
    try {
      await deleteSavedKeywordTag({ data: { projectId, tagId } });
      await invalidate();
      toast.success(
        intl.formatMessage({ id: "saved.tagManage.deleteSuccessToast" }),
      );
      return true;
    } catch (error) {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "saved.tagManage.deleteErrorFallback" }),
        ),
      );
      return false;
    } finally {
      markBusy(tagId, false);
    }
  };

  return { busyTagIds, updateTag, deleteTag };
}
