CREATE TABLE `audit_issue_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`project_id` text NOT NULL,
	`page_id` text,
	`rule_id` text NOT NULL,
	`rule_version` text NOT NULL,
	`issue_group` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`url` text NOT NULL,
	`evidence_json` text,
	`first_seen_at` text DEFAULT (current_timestamp) NOT NULL,
	`last_seen_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `audit_pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_issue_occurrences_unique_idx` ON `audit_issue_occurrences` (`audit_id`,`rule_id`,`url`);--> statement-breakpoint
CREATE INDEX `audit_issue_occurrences_group_idx` ON `audit_issue_occurrences` (`audit_id`,`issue_group`,`severity`);--> statement-breakpoint
CREATE INDEX `audit_issue_occurrences_rule_idx` ON `audit_issue_occurrences` (`audit_id`,`rule_id`);--> statement-breakpoint
CREATE TABLE `audit_issue_rollups` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`issue_group` text NOT NULL,
	`severity` text NOT NULL,
	`url_count` integer NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_issue_rollups_unique_idx` ON `audit_issue_rollups` (`audit_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `audit_issue_rollups_group_idx` ON `audit_issue_rollups` (`audit_id`,`issue_group`);--> statement-breakpoint
ALTER TABLE `audit_pages` ADD `has_mixed_content` integer DEFAULT false NOT NULL;