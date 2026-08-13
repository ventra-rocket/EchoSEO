CREATE TABLE `report_sends` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`kind` text NOT NULL,
	`period_key` text NOT NULL,
	`audit_id` text,
	`claimed_at` text DEFAULT (current_timestamp) NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`subscription_id`) REFERENCES `report_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_sends_period_idx` ON `report_sends` (`subscription_id`,`kind`,`period_key`);--> statement-breakpoint
CREATE INDEX `report_sends_throttle_idx` ON `report_sends` (`subscription_id`,`kind`,`sent_at`);--> statement-breakpoint
CREATE TABLE `report_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`cadence` text DEFAULT 'weekly' NOT NULL,
	`recipient_email` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`max_pages` integer DEFAULT 100 NOT NULL,
	`unsubscribe_token` text NOT NULL,
	`last_sent_at` text,
	`unsubscribed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`target_id`) REFERENCES `audit_targets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_subscriptions_target_idx` ON `report_subscriptions` (`target_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_subscriptions_token_idx` ON `report_subscriptions` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `report_subscriptions_enabled_idx` ON `report_subscriptions` (`enabled`,`cadence`);