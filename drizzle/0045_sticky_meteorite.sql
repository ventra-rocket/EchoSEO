ALTER TABLE `audits` ADD `crawl_settled_rate` real;--> statement-breakpoint
ALTER TABLE `audits` ADD `crawl_lowest_rate` real;--> statement-breakpoint
ALTER TABLE `audits` ADD `crawl_highest_rate` real;--> statement-breakpoint
ALTER TABLE `audits` ADD `crawl_refused_requests` integer;--> statement-breakpoint
ALTER TABLE `audits` ADD `crawl_congested_batches` integer;