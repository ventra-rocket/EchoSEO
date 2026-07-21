CREATE TABLE `audit_referring_domain_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`target_id` text NOT NULL,
	`provider` text NOT NULL,
	`target` text NOT NULL,
	`coverage` text NOT NULL,
	`referring_domains` integer NOT NULL,
	`new_referring_domains` integer,
	`lost_referring_domains` integer,
	`queried_at` text NOT NULL,
	`triggered_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_referring_domain_snapshots_target_idx` ON `audit_referring_domain_snapshots` (`target_id`,`queried_at`);