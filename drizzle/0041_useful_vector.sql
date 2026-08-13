ALTER TABLE `audit_snapshots` ADD `pages_redirected` integer;--> statement-breakpoint
ALTER TABLE `audit_snapshots` ADD `pages_broken` integer;--> statement-breakpoint
ALTER TABLE `audit_snapshots` ADD `pages_blocked` integer;--> statement-breakpoint
ALTER TABLE `audit_snapshots` ADD `pages_noindex` integer;