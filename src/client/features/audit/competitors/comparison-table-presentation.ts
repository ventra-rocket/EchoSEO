/**
 * Whether a typed URL sits on the competitor's own origin.
 *
 * The server enforces this too and is the authority. It is repeated here because
 * `toClientError` reduces every `AppError` to its code, so a server rejection
 * arrives as "Please check your input" — accurate and useless. The client knows
 * the origin, so it can name the actual problem before a round trip.
 */
export function isOnOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export function pathOf(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    return `${pathname}${search}` === "/" ? "/" : `${pathname}${search}`;
  } catch {
    return url;
  }
}
