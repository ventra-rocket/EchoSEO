import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting. Returns false during SSR
 * / first paint, then updates on mount and on change. Components use this to
 * skip count-up / sweep animations for motion-sensitive users.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
