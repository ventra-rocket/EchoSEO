CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`locale` text NOT NULL,
	`source` text NOT NULL,
	`confirm_token` text NOT NULL,
	`confirm_token_expires_at` text NOT NULL,
	`consent_confirmed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_confirm_token_idx` ON `leads` (`confirm_token`);--> statement-breakpoint
CREATE INDEX `leads_email_normalized_idx` ON `leads` (`email_normalized`);--> statement-breakpoint
CREATE INDEX `leads_domain_idx` ON `leads` (`domain`);--> statement-breakpoint
CREATE TABLE `seo_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`domain` text NOT NULL,
	`url` text NOT NULL,
	`locale` text NOT NULL,
	`status` text NOT NULL,
	`r2_key` text,
	`error` text,
	`finished_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `seo_reports_lead_idx` ON `seo_reports` (`lead_id`);--> statement-breakpoint
CREATE INDEX `seo_reports_domain_status_idx` ON `seo_reports` (`domain`,`status`);