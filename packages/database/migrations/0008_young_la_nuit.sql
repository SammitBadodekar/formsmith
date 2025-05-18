DROP INDEX `form_path_unique`;--> statement-breakpoint
DROP INDEX `published_form_path_unique`;--> statement-breakpoint
ALTER TABLE `published_form` ADD `form_id` text NOT NULL REFERENCES form(id);