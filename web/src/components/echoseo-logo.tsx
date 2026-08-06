/**
 * EchoSEO brand mark + wordmark for the marketing site.
 *
 * Ported (geometry-identical) from the app's `src/client/components/
 * EchoSeoLogo.tsx`. The app version reads daisyUI theme tokens; `web/` has no
 * daisyUI, so this copy is self-contained: arc strokes and the "SEO" accent
 * read local CSS vars that default to the locked dark-ground brand hexes
 * (amber `#F5A524`, teal `#19E3B1`). A light section can override
 * `--echo-primary`/`--echo-accent` on a wrapper.
 *
 * The wordmark is real text (not SVG `<text>`) so it inherits the site font and
 * stays selectable / screen-reader native.
 */

type EchoSeoLogoProps = {
  /** `mark` = icon only; `lockup` = icon + "EchoSEO" wordmark. */
  variant?: "mark" | "lockup";
  className?: string;
};

export function EchoSeoLogo({ variant = "mark", className }: EchoSeoLogoProps) {
  if (variant === "mark") {
    return <EchoMark className={className} title="EchoSEO" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold ${className ?? ""}`}
    >
      <EchoMark className="h-6 w-6 shrink-0" />
      <span>
        Echo<span className="echo-seo-accent">SEO</span>
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
          stroke="var(--echo-accent, #F5A524)"
          strokeWidth="5"
        />
        <path
          d="M34 25 A25 25 0 0 1 34 61"
          stroke="var(--echo-primary, #19E3B1)"
          strokeWidth="6.5"
        />
        <path
          d="M48 16 A36 36 0 0 1 48 70"
          stroke="var(--echo-primary, #19E3B1)"
          strokeWidth="8"
          opacity=".82"
        />
      </g>
    </svg>
  );
}
