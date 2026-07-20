CREATE TABLE `audit_link_edges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` text NOT NULL,
	`source_url` text NOT NULL,
	`target_url` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_link_edges_unique_idx` ON `audit_link_edges` (`audit_id`,`source_url`,`target_url`);--> statement-breakpoint
CREATE INDEX `audit_link_edges_target_idx` ON `audit_link_edges` (`audit_id`,`target_url`);--> statement-breakpoint
CREATE INDEX `audit_link_edges_source_idx` ON `audit_link_edges` (`audit_id`,`source_url`);--> statement-breakpoint
CREATE TABLE `audit_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`project_id` text NOT NULL,
	`target_id` text NOT NULL,
	`pages_crawled` integer NOT NULL,
	`edge_count` integer NOT NULL,
	`lighthouse_count` integer NOT NULL,
	`sealed_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_snapshots_audit_idx` ON `audit_snapshots` (`audit_id`);--> statement-breakpoint
CREATE INDEX `audit_snapshots_target_idx` ON `audit_snapshots` (`target_id`,`sealed_at`);--> statement-breakpoint
CREATE INDEX `audit_snapshots_project_idx` ON `audit_snapshots` (`project_id`,`sealed_at`);--> statement-breakpoint
ALTER TABLE `audit_pages` ADD `in_sitemap` integer DEFAULT false NOT NULL;