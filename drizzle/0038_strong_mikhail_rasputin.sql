CREATE TABLE `organization_seo_credentials` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'dataforseo' NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`key_last4` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
