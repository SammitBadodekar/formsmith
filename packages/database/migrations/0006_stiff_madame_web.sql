ALTER TABLE `published_form` ADD `subdomain` text;--> statement-breakpoint
ALTER TABLE `published_form` ADD `path` text;--> statement-breakpoint
CREATE UNIQUE INDEX `published_form_subdomain_unique` ON `published_form` (`subdomain`);--> statement-breakpoint
CREATE UNIQUE INDEX `published_form_path_unique` ON `published_form` (`path`);