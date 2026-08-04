import { useEffect } from "react";

/** Honor `prefers-reduced-motion` for the scan/report scrolls. */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * Keeps the reader on whatever the check is doing right now, resolved by element
 * id so no refs thread through the section components.
 *
 * - done: focus and scroll to the report heading (without it the result sat
 *   ~2,000px down, indistinguishable from "nothing happened").
 * - loading: pull the scan skeleton up — the form and the solved bot-check box
 *   are tall enough to leave it below the fold, so a submit would otherwise read
 *   as a lone "Checking…" button under an unchanged page.
 * - error: pull the error into view for a reader who scrolled down watching the
 *   skeleton when it resolved.
 */
export function useLiveStateScroll(
  status: "idle" | "loading" | "error" | "done",
  hasResult: boolean,
) {
  useEffect(() => {
    if (!hasResult) return;
    const heading = document.getElementById("fsc-report-heading");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, [hasResult]);

  useEffect(() => {
    const id =
      status === "loading"
        ? "fsc-scan-heading"
        : status === "error"
          ? "fsc-check-error"
          : null;
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({
      behavior: scrollBehavior(),
      block: status === "error" ? "center" : "start",
    });
  }, [status]);
}
