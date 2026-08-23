-- Additive only: eight new indexes, no column or index removed, so applying
-- this is safe on a live database and no data is rewritten.
--
-- Why each one:
--   projects(organization_id)                     org-scoped project listings;
--     the existing partial-unique index only covers the single Default row.
--   rank_tracking_configs(project_id,is_active,created_at)
--     listConfigsForProject's exact filter + sort.
--   audit_issue_occurrences(page_id)              cascade path from a page
--     delete; unindexed child FKs force a full scan per deleted page.
--   audit_lighthouse_results(page_id)             same cascade path.
--   audit_screenshots(page_id)                    same, via ON DELETE SET NULL.
--   audit_pages(audit_id,url)                     screenshot capture and the
--     page-fact lookups resolve a page by (audit_id, url).
--   account(account_id,provider_id)               better-auth sign-in lookup.
--   verification(expires_at)                      better-auth expired-token
--     cleanup range scan.
--
-- ROLLBACK (safe at any time; indexes carry no data):
--   DROP INDEX `projects_organization_id_idx`;
--   DROP INDEX `rank_tracking_configs_project_active_created_idx`;
--   DROP INDEX `audit_issue_occurrences_page_id_idx`;
--   DROP INDEX `audit_lighthouse_results_page_id_idx`;
--   DROP INDEX `audit_pages_audit_url_idx`;
--   DROP INDEX `audit_screenshots_page_id_idx`;
--   DROP INDEX `account_accountId_providerId_idx`;
--   DROP INDEX `verification_expiresAt_idx`;
-- and revert drizzle/meta/0048_snapshot.json + the _journal.json entry.
CREATE INDEX `projects_organization_id_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `rank_tracking_configs_project_active_created_idx` ON `rank_tracking_configs` (`project_id`,`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_issue_occurrences_page_id_idx` ON `audit_issue_occurrences` (`page_id`);--> statement-breakpoint
CREATE INDEX `audit_lighthouse_results_page_id_idx` ON `audit_lighthouse_results` (`page_id`);--> statement-breakpoint
CREATE INDEX `audit_pages_audit_url_idx` ON `audit_pages` (`audit_id`,`url`);--> statement-breakpoint
CREATE INDEX `audit_screenshots_page_id_idx` ON `audit_screenshots` (`page_id`);--> statement-breakpoint
CREATE INDEX `account_accountId_providerId_idx` ON `account` (`account_id`,`provider_id`);--> statement-breakpoint
CREATE INDEX `verification_expiresAt_idx` ON `verification` (`expires_at`);