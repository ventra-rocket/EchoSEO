import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { Modal } from "@/client/components/Modal";
import { resolveTagColor, tagDotClass } from "@/shared/tag-colors";
import type { SavedKeywordTag, SavedKeywordTagSummary } from "@/types/keywords";
import { TagChip } from "./TagChip";

type Mode = "add" | "remove";

export function SavedKeywordsBulkTagsModal({
  availableTags,
  selectedCount,
  selectedRowTags,
  isPending,
  onClose,
  onApply,
}: {
  availableTags: SavedKeywordTagSummary[];
  selectedCount: number;
  /** Tags currently attached to the selected rows (deduped). Used to show
   *  initial state and to compute which existing tags can be removed. */
  selectedRowTags: SavedKeywordTag[];
  isPending: boolean;
  onClose: () => void;
  onApply: (input: { addTags?: string[]; removeTagIds?: string[] }) => void;
}) {
  const intl = useIntl();
  const [mode, setMode] = useState<Mode>("add");
  const [query, setQuery] = useState("");
  const [addNames, setAddNames] = useState<string[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedAddSet = useMemo(
    () => new Set(addNames.map((name) => name.toLocaleLowerCase())),
    [addNames],
  );

  const availableByNormalized = useMemo(() => {
    const map = new Map<string, SavedKeywordTagSummary>();
    for (const tag of availableTags) {
      map.set(tag.normalizedName, tag);
    }
    return map;
  }, [availableTags]);

  const filteredAvailable = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((tag) => tag.normalizedName.includes(q));
  }, [availableTags, query]);

  const trimmedQuery = query.trim();
  const queryNormalized = trimmedQuery.toLocaleLowerCase();
  const showCreate =
    mode === "add" &&
    trimmedQuery.length > 0 &&
    !availableByNormalized.has(queryNormalized) &&
    !normalizedAddSet.has(queryNormalized);

  const canApply = !isPending && (addNames.length > 0 || removeIds.length > 0);

  const handleToggleAdd = (tag: SavedKeywordTagSummary) => {
    setAddNames((current) =>
      normalizedAddSet.has(tag.normalizedName)
        ? current.filter(
            (name) => name.toLocaleLowerCase() !== tag.normalizedName,
          )
        : [...current, tag.name],
    );
    setRemoveIds((current) => current.filter((id) => id !== tag.id));
  };

  const handleCreate = () => {
    if (!trimmedQuery) return;
    setAddNames((current) =>
      current.some((name) => name.toLocaleLowerCase() === queryNormalized)
        ? current
        : [...current, trimmedQuery],
    );
    setQuery("");
    inputRef.current?.focus();
  };

  const handleToggleRemove = (tag: SavedKeywordTag) => {
    setRemoveIds((current) =>
      current.includes(tag.id)
        ? current.filter((id) => id !== tag.id)
        : [...current, tag.id],
    );
    setAddNames((current) =>
      current.filter((name) => name.toLocaleLowerCase() !== tag.normalizedName),
    );
  };

  return (
    <Modal maxWidth="max-w-lg" onClose={onClose} labelledBy="bulk-tags-title">
      <div className="space-y-4">
        <div>
          <h3 id="bulk-tags-title" className="text-lg font-semibold">
            <FormattedMessage id="saved.bulkTagsModal.title" />
          </h3>
          <p className="text-sm text-base-content/65">
            <FormattedMessage
              id="saved.bulkTagsModal.subtitle"
              values={{ count: selectedCount }}
            />
          </p>
        </div>

        <div className="inline-flex rounded-md border border-base-300 bg-base-200/40 p-0.5 text-sm">
          <SegmentButton
            active={mode === "add"}
            onClick={() => setMode("add")}
            label={<FormattedMessage id="saved.bulkTagsModal.addTagsTab" />}
            count={addNames.length}
          />
          <SegmentButton
            active={mode === "remove"}
            onClick={() => setMode("remove")}
            label={<FormattedMessage id="saved.bulkTagsModal.removeTagsTab" />}
            count={removeIds.length}
            disabled={selectedRowTags.length === 0}
          />
        </div>

        {mode === "add" ? (
          <div className="space-y-2">
            {addNames.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-base-300 bg-base-200/40 px-2 py-2">
                {addNames.map((name) => {
                  const existing = availableByNormalized.get(
                    name.toLocaleLowerCase(),
                  );
                  const tag = existing ?? {
                    id: `new:${name}`,
                    name,
                    normalizedName: name.toLocaleLowerCase(),
                    color: null,
                  };
                  return (
                    <TagChip
                      key={name}
                      tag={tag}
                      size="sm"
                      onClick={() =>
                        setAddNames((current) =>
                          current.filter(
                            (existingName) => existingName !== name,
                          ),
                        )
                      }
                      trailing={<X className="size-3 opacity-70" />}
                      title={intl.formatMessage({
                        id: "saved.bulkTagsModal.removeFromSelectionTitle",
                      })}
                    />
                  );
                })}
              </div>
            ) : null}

            <label className="flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-2 py-2">
              <Search className="size-3.5 opacity-50" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && showCreate) {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder={intl.formatMessage({
                  id: "saved.bulkTagsModal.searchPlaceholder",
                })}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
              />
            </label>

            <div className="max-h-56 overflow-y-auto rounded-md border border-base-300">
              {showCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-base-200"
                >
                  <Plus className="size-3.5 text-primary" />
                  <span className="text-base-content/70">
                    <FormattedMessage id="saved.bulkTagsModal.createLabel" />
                  </span>
                  <span className="font-medium">
                    <FormattedMessage
                      id="saved.bulkTagsModal.createQuery"
                      values={{ query: trimmedQuery }}
                    />
                  </span>
                </button>
              ) : null}

              {filteredAvailable.length === 0 && !showCreate ? (
                <div className="px-3 py-6 text-center text-xs text-base-content/55">
                  <FormattedMessage
                    id={
                      availableTags.length === 0
                        ? "saved.bulkTagsModal.emptyNoTags"
                        : "saved.bulkTagsModal.emptyNoMatches"
                    }
                  />
                </div>
              ) : null}

              {filteredAvailable.map((tag) => {
                const checked = normalizedAddSet.has(tag.normalizedName);
                const color = resolveTagColor(tag);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleAdd(tag)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-base-200"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-primary bg-primary text-primary-content"
                          : "border-base-300"
                      }`}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                    <span
                      className={`size-2 shrink-0 rounded-full ${tagDotClass(color)}`}
                    />
                    <span className="flex-1 truncate text-sm">{tag.name}</span>
                    <span className="text-[11px] tabular-nums text-base-content/45">
                      <FormattedNumber value={tag.keywordCount} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedRowTags.length === 0 ? (
              <div className="rounded-md border border-base-300 bg-base-200/40 px-3 py-6 text-center text-xs text-base-content/55">
                <FormattedMessage id="saved.bulkTagsModal.removeEmpty" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 rounded-md border border-base-300 p-3">
                {selectedRowTags.map((tag) => {
                  const checked = removeIds.includes(tag.id);
                  return (
                    <TagChip
                      key={tag.id}
                      tag={tag}
                      size="sm"
                      onClick={() => handleToggleRemove(tag)}
                      selected={checked}
                      trailing={checked ? <Check className="size-3" /> : null}
                      title={intl.formatMessage({
                        id: checked
                          ? "saved.bulkTagsModal.willBeRemovedTitle"
                          : "saved.bulkTagsModal.clickToRemoveTitle",
                      })}
                    />
                  );
                })}
              </div>
            )}
            {removeIds.length > 0 ? (
              <p className="text-xs text-base-content/55">
                <FormattedMessage
                  id="saved.bulkTagsModal.removeSummary"
                  values={{ count: removeIds.length }}
                />
              </p>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm text-base-content/70 hover:bg-base-200"
            onClick={onClose}
          >
            <FormattedMessage id="saved.bulkTagsModal.cancel" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-content disabled:opacity-50"
            disabled={!canApply}
            onClick={() =>
              onApply({
                addTags: addNames.length > 0 ? addNames : undefined,
                removeTagIds: removeIds.length > 0 ? removeIds : undefined,
              })
            }
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <FormattedMessage id="saved.bulkTagsModal.apply" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  count,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: ReactNode;
  count: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm transition ${
        active
          ? "bg-base-100 font-medium shadow-sm"
          : "text-base-content/65 hover:text-base-content"
      } disabled:opacity-40`}
    >
      {label}
      {count > 0 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-content">
          <FormattedNumber value={count} />
        </span>
      ) : null}
    </button>
  );
}
