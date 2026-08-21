import { FormattedMessage, useIntl } from "react-intl";
import { Check, Minus, X } from "lucide-react";
import {
  isOnOrigin,
  pathOf,
} from "@/client/features/audit/competitors/comparison-table-presentation";
import type {
  CompetitorComparison,
  CompetitorPair,
} from "@/client/features/audit/competitors/types";

/**
 * `pass` renders as a tick, `warn`/`fail` as a cross, and a rule that was never
 * measured on one side renders as a dash — never as a tick. A rule that did not
 * run and a rule that passed are different facts, and showing the first as the
 * second flatters whichever side was not measured.
 */
function Verdict({ status }: { status: string | null }) {
  const intl = useIntl();
  if (status === null) {
    return (
      <span
        className="text-base-content/40"
        title={intl.formatMessage({
          id: "audit.competitors.table.notMeasuredTitle",
        })}
        aria-label={intl.formatMessage({
          id: "audit.competitors.table.notMeasuredLabel",
        })}
      >
        <Minus className="size-4" />
      </span>
    );
  }
  if (status === "pass") {
    return (
      <span
        className="text-success"
        aria-label={intl.formatMessage({
          id: "audit.competitors.table.passesLabel",
        })}
      >
        <Check className="size-4" />
      </span>
    );
  }
  const warnOrFailsLabel = intl.formatMessage({
    id:
      status === "warn"
        ? "audit.competitors.table.warningLabel"
        : "audit.competitors.table.failsLabel",
  });
  return (
    <span
      className="text-error"
      title={warnOrFailsLabel}
      aria-label={warnOrFailsLabel}
    >
      <X className="size-4" />
    </span>
  );
}

/** The eleven-rule scorecard for one pair, or a note when nothing was scored. */
function CompetitorRulesTable({ pair }: { pair: CompetitorPair }) {
  if (pair.rules === null) {
    return (
      <p className="text-sm text-base-content/60">
        <FormattedMessage
          id={
            pair.comparedAt
              ? "audit.competitors.table.notScoredForPair"
              : "audit.competitors.table.notComparedYet"
          }
        />
      </p>
    );
  }
  return (
    <table className="table table-sm">
      <thead>
        <tr>
          <th>
            <FormattedMessage id="audit.competitors.table.columnRule" />
          </th>
          <th className="w-16 text-center">
            <FormattedMessage id="audit.competitors.table.columnYou" />
          </th>
          <th className="w-16 text-center">
            <FormattedMessage id="audit.competitors.table.columnThem" />
          </th>
          <th />
        </tr>
      </thead>
      <tbody>
        {pair.rules.map((rule) => (
          <tr key={rule.ruleId}>
            <td className="font-mono text-xs">{rule.label}</td>
            <td className="text-center">
              <span className="inline-flex justify-center">
                <Verdict status={rule.ours} />
              </span>
            </td>
            <td className="text-center">
              <span className="inline-flex justify-center">
                <Verdict status={rule.theirs} />
              </span>
            </td>
            <td className="text-xs">
              {rule.weLose && (
                <span className="text-error">
                  <FormattedMessage id="audit.competitors.table.behind" />
                </span>
              )}
              {rule.weWin && (
                <span className="text-success">
                  <FormattedMessage id="audit.competitors.table.ahead" />
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One page pair: the URL comparison line, the rule scorecard, and the
 * hand-pairing control that lets an operator override the automatic match.
 */
export function CompetitorPairCard({
  competitor,
  pair,
  canManage,
  editing,
  draftUrl,
  busy,
  onDraftUrlChange,
  onStartEditing,
  onCancelEditing,
  onSave,
}: {
  competitor: Pick<CompetitorComparison, "competitorId" | "origin">;
  pair: CompetitorPair;
  canManage: boolean;
  editing: string | null;
  draftUrl: string;
  busy: boolean;
  onDraftUrlChange: (value: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="rounded-lg border border-base-300 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-sm">
        <span className="truncate">{pathOf(pair.ourUrl)}</span>
        <span className="text-base-content/40">
          <FormattedMessage id="audit.competitors.table.vs" />
        </span>
        <span className="truncate text-base-content/80">
          {pathOf(pair.theirUrl)}
        </span>
        {pair.matchSource === "manual" ? (
          <span className="badge badge-ghost badge-sm">
            <FormattedMessage id="audit.competitors.table.pairedByHandBadge" />
          </span>
        ) : (
          pair.matchConfidence !== null && (
            <span className="badge badge-ghost badge-sm">
              <FormattedMessage
                id="audit.competitors.table.matchPercent"
                values={{
                  percent: Math.round(pair.matchConfidence * 100),
                }}
              />
            </span>
          )
        )}
      </div>

      {pair.failureReason && (
        <p className="text-sm text-warning">{pair.failureReason}</p>
      )}

      <CompetitorRulesTable pair={pair} />

      {canManage &&
        (editing === pair.pageId ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input input-bordered input-sm flex-1 font-mono"
              placeholder={`${competitor.origin}/their-page`}
              value={draftUrl}
              disabled={busy}
              onChange={(event) => onDraftUrlChange(event.target.value)}
            />
            <button
              className="btn btn-sm btn-primary"
              disabled={busy || !isOnOrigin(draftUrl.trim(), competitor.origin)}
              title={
                isOnOrigin(draftUrl.trim(), competitor.origin)
                  ? undefined
                  : intl.formatMessage(
                      {
                        id: "audit.competitors.table.mustBeUrlOn",
                      },
                      { host: new URL(competitor.origin).host },
                    )
              }
              onClick={onSave}
            >
              <FormattedMessage id="audit.competitors.table.savePairing" />
            </button>
            <button
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={onCancelEditing}
            >
              <FormattedMessage id="audit.competitors.table.cancel" />
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-xs" onClick={onStartEditing}>
            <FormattedMessage id="audit.competitors.table.pairDifferentPage" />
          </button>
        ))}
    </div>
  );
}

/** One of our pages with no counterpart on the competitor's site yet. */
export function UnpairedUrlRow({
  competitor,
  ourUrl,
  editing,
  draftUrl,
  busy,
  onDraftUrlChange,
  onStartEditing,
  onSave,
}: {
  competitor: Pick<CompetitorComparison, "competitorId" | "origin">;
  ourUrl: string;
  editing: string | null;
  draftUrl: string;
  busy: boolean;
  onDraftUrlChange: (value: string) => void;
  onStartEditing: () => void;
  onSave: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="font-mono text-xs sm:w-40 truncate">
        {pathOf(ourUrl)}
      </span>
      {editing === ourUrl ? (
        <>
          <input
            className="input input-bordered input-sm flex-1 font-mono"
            placeholder={`${competitor.origin}/their-page`}
            value={draftUrl}
            disabled={busy}
            onChange={(event) => onDraftUrlChange(event.target.value)}
          />
          <button
            className="btn btn-sm btn-primary"
            disabled={busy || !isOnOrigin(draftUrl.trim(), competitor.origin)}
            title={
              isOnOrigin(draftUrl.trim(), competitor.origin)
                ? undefined
                : intl.formatMessage(
                    {
                      id: "audit.competitors.table.mustBeUrlOn",
                    },
                    { host: new URL(competitor.origin).host },
                  )
            }
            onClick={onSave}
          >
            <FormattedMessage id="audit.competitors.table.savePairing" />
          </button>
        </>
      ) : (
        <button className="btn btn-ghost btn-xs" onClick={onStartEditing}>
          <FormattedMessage id="audit.competitors.table.pairByHand" />
        </button>
      )}
    </div>
  );
}
