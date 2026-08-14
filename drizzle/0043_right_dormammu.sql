CREATE TABLE `audit_competitor_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`competitor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`our_url` text NOT NULL,
	`their_url` text NOT NULL,
	`match_source` text DEFAULT 'auto' NOT NULL,
	`match_confidence` real,
	`last_run_audit_id` text,
	`their_issues_json` text,
	`their_status_code` integer,
	`their_title` text,
	`failure_reason` text,
	`compared_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`competitor_id`) REFERENCES `audit_competitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_competitor_pages_unique_idx` ON `audit_competitor_pages` (`competitor_id`,`our_url`);--> statement-breakpoint
CREATE INDEX `audit_competitor_pages_target_idx` ON `audit_competitor_pages` (`target_id`);