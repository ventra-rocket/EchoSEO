ALTER TABLE `audit_pages` ADD `is_html` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_snapshots` ADD `issues_materialized_at` text;