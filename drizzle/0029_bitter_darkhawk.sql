CREATE TABLE `audit_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`origin` text NOT NULL,
	`allowed_hosts_json` text DEFAULT '[]' NOT NULL,
	`max_pages_limit` integer DEFAULT 10000 NOT NULL,
	`retention_days` integer DEFAULT 90 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_targets_project_origin_idx` ON `audit_targets` (`project_id`,`origin`);--> statement-breakpoint
CREATE INDEX `audit_targets_organization_idx` ON `audit_targets` (`organization_id`);