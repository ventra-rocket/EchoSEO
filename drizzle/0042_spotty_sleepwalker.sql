CREATE TABLE `audit_competitors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`target_id` text NOT NULL,
	`origin` text NOT NULL,
	`label` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_competitors_target_origin_idx` ON `audit_competitors` (`target_id`,`origin`);--> statement-breakpoint
CREATE INDEX `audit_competitors_project_idx` ON `audit_competitors` (`project_id`);