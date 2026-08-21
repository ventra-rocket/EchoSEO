// Saved Keywords: header, bulk-tags modal, tag management rows and their confirmations.
// One id per literal string avoids five copies of one sentence drifting
// apart; a shared action belongs in `common` instead.
export const savedModals = {
  // Header (SavedKeywordsHeader.tsx). The <h1> itself reuses `nav.savedKeywords`
  // (same pattern as rank.page.subtitle reusing nav.rankTracking), so only the
  // sentence under it and the two dropdown menus need ids here. The Export
  // trigger below reuses `common.table.export` / `common.sheets.export`: the
  // shared TableBulkExportMenu renders that exact button for the same
  // "Export" action lower on this same page (SavedKeywordsBulkActionBar).
  "saved.header.subtitle":
    "Save keyword ideas from research, organize them with tags, and revisit when you're ready to act.",
  "saved.header.actionsMenu.trigger": "Actions",
  "saved.header.actionsMenu.updating": "Updating...",
  "saved.header.actionsMenu.updateStats": "Update keyword stats",
  "saved.header.actionsMenu.updateStatsHint": "Volume, difficulty & CPC",

  // Bulk tags modal (SavedKeywordsBulkTagsModal.tsx) — apply or remove tags
  // across the selected rows.
  "saved.bulkTagsModal.title": "Update tags",
  "saved.bulkTagsModal.subtitle":
    "Apply or remove tags across {count, plural, one {# selected keyword} other {# selected keywords}}.",
  "saved.bulkTagsModal.addTagsTab": "Add tags",
  "saved.bulkTagsModal.removeTagsTab": "Remove tags",
  "saved.bulkTagsModal.removeFromSelectionTitle": "Remove from selection",
  "saved.bulkTagsModal.searchPlaceholder": "Search or create…",
  "saved.bulkTagsModal.createLabel": "Create",
  "saved.bulkTagsModal.createQuery": "“{query}”",
  "saved.bulkTagsModal.emptyNoTags":
    "No tags yet. Type a name above to create one.",
  "saved.bulkTagsModal.emptyNoMatches": "No tags match that search.",
  "saved.bulkTagsModal.removeEmpty":
    "The selected keywords don't have any tags to remove.",
  "saved.bulkTagsModal.willBeRemovedTitle": "Will be removed",
  "saved.bulkTagsModal.clickToRemoveTitle": "Click to remove",
  "saved.bulkTagsModal.removeSummary":
    "{count, plural, one {# tag} other {# tags}} will be detached from the selected keywords.",
  "saved.bulkTagsModal.cancel": "Cancel",
  "saved.bulkTagsModal.apply": "Apply",

  // Tag CRUD (useTagManage.ts) — rename/recolor/delete a tag definition,
  // triggered from ManageTagRow below. Distinct from the bulk modal above,
  // which attaches/detaches existing tags rather than editing the tag itself.
  "saved.tagManage.updateSuccessToast": "Tag updated",
  "saved.tagManage.updateErrorFallback": "Could not update tag",
  "saved.tagManage.deleteSuccessToast": "Tag deleted",
  "saved.tagManage.deleteErrorFallback":
    "Could not delete tag. Detach it from all keywords and try again.",

  // Tag CRUD row UI (ManageTagRow.tsx). Color swatches carry no visible text —
  // only a screen-reader name — so every TAG_COLOR_KEYS entry
  // (src/shared/tag-colors.ts) needs its own id.
  "saved.tagManage.row.renameLabel": "Rename",
  "saved.tagManage.row.colorLabel": "Color",
  "saved.tagManage.row.color.slate": "Slate",
  "saved.tagManage.row.color.rose": "Rose",
  "saved.tagManage.row.color.amber": "Amber",
  "saved.tagManage.row.color.lime": "Lime",
  "saved.tagManage.row.color.emerald": "Emerald",
  "saved.tagManage.row.color.sky": "Sky",
  "saved.tagManage.row.color.violet": "Violet",
  "saved.tagManage.row.color.fuchsia": "Fuchsia",
  "saved.tagManage.row.delete": "Delete",
  "saved.tagManage.row.cancel": "Cancel",
  "saved.tagManage.row.save": "Save",

  // Delete confirmation (SavedKeywordsModals.tsx). RemoveSavedKeywordsError in
  // the same file renders a pre-formatted `message` prop verbatim and owns no
  // literal strings of its own.
  "saved.deleteModal.title": "Delete keywords?",
  "saved.deleteModal.body":
    "This will permanently delete {count, plural, one {# saved keyword} other {# saved keywords}}.",
  "saved.deleteModal.cancel": "Cancel",
  "saved.deleteModal.confirm":
    "Delete {count, plural, one {# keyword} other {# keywords}}",
} as const;
