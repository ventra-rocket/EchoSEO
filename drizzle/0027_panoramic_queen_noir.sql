CREATE TABLE `deep_check_dedupe` (
	`domain_day` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `seo_reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `seo_reports` ADD `canonical_report_id` text;--> statement-breakpoint
CREATE INDEX `seo_reports_canonical_idx` ON `seo_reports` (`canonical_report_id`);