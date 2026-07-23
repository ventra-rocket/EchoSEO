CREATE TABLE `audit_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`target_id` text NOT NULL,
	`audit_id` text,
	`actor_user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`submitted_count` integer DEFAULT 0 NOT NULL,
	`detail_json` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_actions_target_idx` ON `audit_actions` (`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actions_project_idx` ON `audit_actions` (`project_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `audit_targets` ADD `indexnow_key` text;