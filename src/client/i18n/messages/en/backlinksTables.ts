// Backlinks tables: backlinks, referring domains and top pages tables, their columns, toolbar menus, filters and export controls.
//
// `metric.*` holds cross-table words reused byte-for-byte as a result-tab
// label, a filter-panel range title and/or a column header ("Rank" means the
// same thing everywhere it appears) — one id avoids one of those three
// spellings drifting from the other two. Everything else is scoped to the
// table or panel it renders in.
export const backlinksTables = {
  "backlinksTables.metric.backlinks": "Backlinks",
  "backlinksTables.metric.referringDomains": "Referring Domains",
  "backlinksTables.metric.rank": "Rank",
  "backlinksTables.metric.spam": "Spam",
  "backlinksTables.metric.spamScore": "Spam Score",
  "backlinksTables.metric.ahrefsDr": "Ahrefs DR",

  // Result tabs (BacklinksPageSections.tsx BACKLINKS_RESULTS_TABS /
  // TAB_LOADING_LABELS) and their descriptions (backlinksPageUtils.ts
  // TAB_DESCRIPTIONS). "Backlinks" and "Referring Domains" tab labels reuse
  // metric.backlinks / metric.referringDomains above.
  "backlinksTables.tab.pages": "Top Pages",
  "backlinksTables.tab.description.backlinks":
    "See the individual links pointing to your target, including source page, anchor text, and link quality signals.",
  "backlinksTables.tab.description.domains":
    "View the unique domains linking to your target, grouped at the site level instead of by individual link.",
  "backlinksTables.tab.description.pages":
    "See which pages on the target site attract the most backlinks and referring domains.",
  "backlinksTables.tab.loading.backlinks": "Loading backlinks…",
  "backlinksTables.tab.loading.domains": "Loading referring domains…",
  "backlinksTables.tab.loading.pages": "Loading top pages…",

  // Results card toolbar: the backlinks-tab one-per-domain/all-links switch
  // (BacklinksPageSections.tsx). The filter toggle button itself reuses
  // saved.table.filter.filtersLabel / saved.table.filter.toggleTooltip.
  "backlinksTables.toolbar.viewAriaLabel": "Backlinks view",
  "backlinksTables.toolbar.onePerDomain": "One per domain",
  "backlinksTables.toolbar.onePerDomainTitle":
    "Show each referring domain's strongest link; expand a row for the rest",
  "backlinksTables.toolbar.allLinks": "All links",
  "backlinksTables.toolbar.allLinksTitle": "List every individual backlink",

  // Export menu (BacklinksToolbarMenus.tsx BacklinksExportMenu). The trigger
  // and its two menu items reuse common.table.export / common.sheets.export /
  // saved.table.bulk.exportCsv instead of a second "Export"/"Export CSV" id.
  "backlinksTables.export.ariaLabel": "Export backlinks table",

  // Actions menu (BacklinksToolbarMenus.tsx BacklinksActionsMenu). The trigger
  // text doubles as its aria-label and title (identical accessible name); the
  // "Ahrefs DR" button label reuses metric.ahrefsDr above.
  "backlinksTables.actions.ariaLabel": "Backlinks table actions",
  "backlinksTables.actions.ahrefsDrTitle":
    "Look up Ahrefs Domain Rating for each domain in the table",

  // Backlinks table columns (BacklinksTableColumns.tsx). "Spam" and
  // "Ahrefs DR" labels reuse metric.spam / metric.ahrefsDr above.
  "backlinksTables.column.source": "Source",
  "backlinksTables.tooltip.source": "Page linking to you",
  "backlinksTables.column.target": "Target",
  "backlinksTables.tooltip.target": "Destination on your site",
  "backlinksTables.column.anchor": "Anchor",
  "backlinksTables.tooltip.anchor": "Text or format of the link",
  "backlinksTables.anchorEmpty": "No anchor text",
  "backlinksTables.column.flags": "Flags",
  "backlinksTables.tooltip.flags":
    "Special backlink attributes, such as lost, broken, nofollow, or multiple links from the same source.",
  "backlinksTables.column.link": "Link",
  "backlinksTables.tooltip.link": "Authority of the linking page",
  "backlinksTables.column.da": "DA",
  "backlinksTables.tooltip.da": "Authority of the linking domain",
  "backlinksTables.tooltip.backlinksSpam":
    "Estimated spam risk for this backlink. Higher scores are more likely to be manipulative or low quality.",
  "backlinksTables.column.firstSeen": "First Seen",
  "backlinksTables.tooltip.backlinksFirstSeen":
    "When this link was first discovered by the crawler",
  "backlinksTables.lastSeen": "Last {date}",
  "backlinksTables.tooltip.backlinksAhrefsDr":
    "Ahrefs Domain Rating (0-100) for the linking domain.",

  // Row-expansion affordances and status rows (BacklinksTableColumns.tsx
  // BacklinkFlags / StatusCell / SourceCell) — shown on a domain's strongest-
  // link row when it has more than one backlink, and while/after the rest load.
  "backlinksTables.flag.lost": "Lost",
  "backlinksTables.flag.broken": "Broken",
  "backlinksTables.flag.nofollow": "Nofollow",
  "backlinksTables.flag.linksCount":
    "{count, plural, one {# link} other {# links}}",
  "backlinksTables.state.loadingLinks": "Loading links…",
  "backlinksTables.state.loadError": "Couldn't load this domain's links.",
  "backlinksTables.state.noOtherLinks": "No other links from this domain.",
  "backlinksTables.source.hideLinksFromDomain": "Hide all links from {domain}",
  "backlinksTables.source.showLinksFromDomain": "Show all links from {domain}",

  // Referring domains table columns (ReferringDomainsTable.tsx). "Rank" and
  // "Ahrefs DR" labels reuse metric.rank / metric.ahrefsDr above.
  "backlinksTables.column.domain": "Domain",
  "backlinksTables.tooltip.domain":
    "The referring site linking to your target.",
  "backlinksTables.tooltip.domainsBacklinks":
    "Total backlinks found from this domain.",
  "backlinksTables.column.referringPages": "Referring Pages",
  "backlinksTables.tooltip.referringPages":
    "Unique pages on this domain that link to your target.",
  "backlinksTables.tooltip.domainsRank":
    "Authority score for the referring domain.",
  "backlinksTables.tooltip.domainsSpam":
    "Spam risk score for this referring domain.",
  "backlinksTables.tooltip.domainsFirstSeen":
    "When this domain was first discovered linking to your target.",
  "backlinksTables.tooltip.domainsAhrefsDr":
    "Ahrefs Domain Rating (0-100) for this referring domain.",
  "backlinksTables.column.issues": "Issues",
  "backlinksTables.tooltip.issues":
    "Broken link and broken page counts tied to this domain.",
  "backlinksTables.issues.brokenLinks": "Broken links: {count}",
  "backlinksTables.issues.brokenPages": "Broken pages: {count}",

  // Top pages table columns (TopPagesTable.tsx). "Backlinks", "Referring
  // Domains" and "Rank" labels reuse the metric.* ids above.
  "backlinksTables.column.page": "Page",
  "backlinksTables.tooltip.page":
    "Page on the target site receiving backlinks.",
  "backlinksTables.tooltip.pagesBacklinks":
    "Total backlinks pointing to this page.",
  "backlinksTables.tooltip.pagesReferringDomains":
    "Unique domains linking to this page.",
  "backlinksTables.tooltip.pagesRank": "Authority score for this target page.",
  "backlinksTables.column.brokenBacklinks": "Broken Backlinks",
  "backlinksTables.tooltip.pagesBrokenBacklinks":
    "Backlinks pointing here that are currently broken.",

  // Per-table empty states (BacklinksPageEmptyTableState.tsx EmptyTableState
  // takes a labelId; one id per table).
  "backlinksTables.empty.backlinks": "No backlinks match this filter.",
  "backlinksTables.empty.domains": "No referring domains match this filter.",
  "backlinksTables.empty.pages": "No top pages match this filter.",

  // Filter panel toggle controls, backlinks tab only
  // (BacklinksFilterPanel.tsx BacklinksToggleControls).
  "backlinksTables.filter.linkType.label": "Link Type",
  "backlinksTables.filter.linkType.all": "All",
  "backlinksTables.filter.linkType.dofollow": "Dofollow",
  "backlinksTables.filter.linkType.nofollow": "Nofollow",
  "backlinksTables.filter.visibility.label": "Visibility",
  "backlinksTables.filter.visibility.hideLost": "Hide lost",
  "backlinksTables.filter.visibility.hideBroken": "Hide broken",

  // Filter panel text fields and range titles, one block per tab
  // (BacklinksFilterPanel.tsx). The include/exclude example placeholder is
  // byte-identical between the backlinks and domains tabs, so it is shared
  // rather than spelled twice. "Backlinks", "Referring Domains" and "Rank"
  // range titles reuse the metric.* ids above.
  "backlinksTables.filter.placeholder.domainExample": "example.com, blog",
  "backlinksTables.filter.placeholder.spamExample": "spam, forum",
  "backlinksTables.filter.backlinks.sourceContains": "Source URL Contains",
  "backlinksTables.filter.backlinks.sourceExcludes": "Source URL Excludes",
  "backlinksTables.filter.range.domainAuthority": "Domain Authority",
  "backlinksTables.filter.range.linkAuthority": "Link Authority",
  "backlinksTables.filter.domains.domainContains": "Domain Contains",
  "backlinksTables.filter.domains.domainExcludes": "Domain Excludes",
  "backlinksTables.filter.pages.pageContains": "Page URL Contains",
  "backlinksTables.filter.pages.pageContainsPlaceholder": "/blog, /products",
  "backlinksTables.filter.pages.pageExcludes": "Page URL Excludes",
  "backlinksTables.filter.pages.pageExcludesPlaceholder": "/tag, /author",
} as const;
