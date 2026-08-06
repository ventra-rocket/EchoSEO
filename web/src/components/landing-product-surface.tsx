/**
 * Hero product surface — an authored EchoSEO app mock (keyword research + GSC
 * performance) rendered in the product's real dark theme so it floats as the
 * focal object over the bright teal hero band.
 *
 * Honesty guardrails: it mirrors views that genuinely exist, uses example data
 * consistent with the MCP transcript, and is always labelled a "sample
 * workspace" — never presented as a customer result. All numbers are static
 * (no runtime randomness) so SSR and client markup match exactly.
 */

import type { HeroSurface } from "./landing-content";

// Weekly organic-clicks series for the sample chart. Hard-coded (deterministic)
// with a real-looking rising-with-noise shape — a smooth curve reads as fake.
const CLICKS = [58, 71, 64, 88, 82, 104, 129, 118, 146, 162, 188, 214];

const VB_W = 560;
const VB_H = 180;
const PAD_T = 16;
const PAD_B = 24;
const PAD_X = 6;

function buildChart(data: number[]) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const plotH = VB_H - PAD_T - PAD_B;
  const innerW = VB_W - PAD_X * 2;
  const pts = data.map((v, i) => {
    const x = PAD_X + (i * innerW) / (data.length - 1);
    const y = PAD_T + (1 - (v - min) / (max - min)) * plotH;
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const baseY = VB_H - PAD_B;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)} ${baseY} L${first[0].toFixed(1)} ${baseY} Z`;
  return { line, area, last };
}

const CHART = buildChart(CLICKS);
const GRID_LINES = [0, 1, 2, 3];

/** KD (keyword difficulty) → a colour band: easy / moderate / hard. */
function kdClass(kd: string) {
  const n = Number(kd);
  const tier = Number.isNaN(n)
    ? "mid"
    : n < 30
      ? "low"
      : n < 45
        ? "mid"
        : "high";
  return `esl-surface-kd esl-surface-kd--${tier}`;
}

export function ProductSurface({ surface }: { surface: HeroSurface }) {
  const s = surface;
  return (
    <div className="esl-surface" role="img" aria-label={s.aria}>
      <div className="esl-surface-bar" aria-hidden="true">
        <span className="esl-surface-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="esl-surface-title esl-mono">
          echoseo<span className="esl-surface-sep">/</span>
          {s.view}
        </span>
        <span className="esl-surface-tag esl-mono">{s.sampleTag}</span>
      </div>

      <div className="esl-surface-tabs" aria-hidden="true">
        {s.tabs.map((t, i) => (
          <span
            key={t}
            className={`esl-surface-tab${i === 1 ? " is-active" : ""}`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="esl-surface-body" aria-hidden="true">
        <div className="esl-surface-metrics">
          {s.metrics.map((m) => (
            <div className="esl-surface-metric" key={m.label}>
              <span className="esl-surface-metric-label esl-mono">
                {m.label}
              </span>
              <span className="esl-surface-metric-value">{m.value}</span>
              <span className="esl-surface-metric-delta esl-mono">
                ▲ {m.delta}
              </span>
            </div>
          ))}
        </div>

        <div className="esl-surface-chart">
          <div className="esl-surface-chart-head">
            <span className="esl-surface-chart-title">
              <span className="esl-surface-legend-dot" />
              {s.chartTitle}
            </span>
            <span className="esl-surface-chart-range esl-mono">
              {s.chartRange}
            </span>
          </div>
          <svg
            className="esl-surface-svg"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="esl-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#19e3b1" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#19e3b1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {GRID_LINES.map((i) => {
              const y = PAD_T + (i * (VB_H - PAD_T - PAD_B)) / 3;
              return (
                <line
                  key={i}
                  x1="0"
                  x2={VB_W}
                  y1={y}
                  y2={y}
                  className="esl-surface-grid"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <path d={CHART.area} fill="url(#esl-area-fill)" />
            <path
              d={CHART.line}
              className="esl-surface-line"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={CHART.last[0]}
              cy={CHART.last[1]}
              r="3.5"
              className="esl-surface-marker"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="esl-surface-axis esl-mono">
            {s.axisLabels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        <div className="esl-surface-table-wrap">
          <table className="esl-surface-table">
            <thead>
              <tr>
                <th>{s.cols.keyword}</th>
                <th className="num">{s.cols.volume}</th>
                <th className="num">{s.cols.kd}</th>
                <th className="num">{s.cols.pos}</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.keyword}>
                  <td className="kw">{r.keyword}</td>
                  <td className="num">{r.volume}</td>
                  <td className="num">
                    <span className={kdClass(r.kd)}>{r.kd}</span>
                  </td>
                  <td className="num pos">{r.pos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
