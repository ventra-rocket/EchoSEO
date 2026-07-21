CREATE TABLE `audit_export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`workflow_instance_id` text,
	`r2_key` text,
	`row_count` integer,
	`size_bytes` integer,
	`error_message` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`ready_at` text,
	`expires_at` text,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_export_jobs_project_idx` ON `audit_export_jobs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_export_jobs_audit_idx` ON `audit_export_jobs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `audit_export_jobs_status_idx` ON `audit_export_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `audit_export_jobs_expires_idx` ON `audit_export_jobs` (`expires_at`);