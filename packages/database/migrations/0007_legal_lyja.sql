ALTER TABLE `form` ADD `subdomain` text;--> statement-breakpoint
ALTER TABLE `form` ADD `path` text;--> statement-breakpoint
CREATE UNIQUE INDEX `form_subdomain_unique` ON `form` (`subdomain`);--> statement-breakpoint
CREATE UNIQUE INDEX `form_path_unique` ON `form` (`path`);