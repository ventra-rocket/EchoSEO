interface EchoSeoLogoProps {
  /**
   * `mark` renders the echo mark alone (square, sized by `className`).
   * `lockup` pairs it with the "EchoSEO" wordmark.
   */
  variant?: "mark" | "lockup";
  className?: string;
}

/**
 * The EchoSEO brand mark: three forward-skewed arcs — an amber signal source and
 * two teal echoes returning. Arc strokes read from the daisyUI theme tokens, so
 * the mark follows the active theme instead of pinning the dark-ground hexes
 * (whose teal is too light to sit on the light theme's white surfaces).
 *
 * The wordmark is real text rather than SVG `<text>` so it inherits the app font
 * and stays selectable and screen-reader native.
 *
 * `echoseo-mark.svg` beside this file is the same geometry as a standalone
 * favicon — it cannot use theme tokens, so it pins the dark-ground hexes and
 * adds a ground rect. Change one, change the other.
 */
export function EchoSeoLogo({ variant = "mark", className }: EchoSeoLogoProps) {
  if (variant === "mark") {
    return <EchoMark className={className} title="EchoSEO" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold ${className ?? ""}`}
    >
      <EchoMark className="size-6 shrink-0" />
      <span>
        Echo<span className="text-primary">SEO</span>
      </span>
    </span>
  );
}

/** `title` gives the mark an accessible name; omit it when a wordmark follows. */
function EchoMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      // Intrinsic size so a call site that forgets a sizing class still gets a
      // 96px mark rather than the browser's 300px default for replaced
      // elements. Any width/height utility class overrides these.
      width="96"
      height="96"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g
        fill="none"
        strokeLinecap="round"
        transform="translate(20 8) skewX(-10)"
      >
        <path
          d="M22 34 A13 13 0 0 1 22 52"
          stroke="var(--color-accent)"
          strokeWidth="5"
        />
        <path
          d="M34 25 A25 25 0 0 1 34 61"
          stroke="var(--color-primary)"
          strokeWidth="6.5"
        />
        <path
          d="M48 16 A36 36 0 0 1 48 70"
          stroke="var(--color-primary)"
          strokeWidth="8"
          opacity=".82"
        />
      </g>
    </svg>
  );
}
