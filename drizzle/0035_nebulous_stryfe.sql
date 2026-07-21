CREATE TABLE `audit_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`url` text NOT NULL,
	`page_id` text,
	`status` text NOT NULL,
	`r2_key` text,
	`content_type` text,
	`width` integer,
	`height` integer,
	`captured_at` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `audit_pages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_screenshots_audit_url_idx` ON `audit_screenshots` (`audit_id`,`url`);--> statement-breakpoint
CREATE INDEX `audit_screenshots_audit_idx` ON `audit_screenshots` (`audit_id`);--> statement-breakpoint
CREATE INDEX `audit_screenshots_captured_idx` ON `audit_screenshots` (`captured_at`);