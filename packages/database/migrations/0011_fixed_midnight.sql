PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_form_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`data` text,
	`created_at` integer,
	FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_form_submission`("id", "form_id", "data", "created_at") SELECT "id", "form_id", "data", "created_at" FROM `form_submission`;--> statement-breakpoint
DROP TABLE `form_submission`;--> statement-breakpoint
ALTER TABLE `__new_form_submission` RENAME TO `form_submission`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_published_form` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`image` text,
	`logo` text,
	`form_id` text NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`data` text,
	`created_at` integer,
	`updated_at` integer,
	`subdomain` text,
	`path` text,
	FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_published_form`("id", "name", "description", "image", "logo", "form_id", "user_id", "workspace_id", "data", "created_at", "updated_at", "subdomain", "path") SELECT "id", "name", "description", "image", "logo", "form_id", "user_id", "workspace_id", "data", "created_at", "updated_at", "subdomain", "path" FROM `published_form`;--> statement-breakpoint
DROP TABLE `published_form`;--> statement-breakpoint
ALTER TABLE `__new_published_form` RENAME TO `published_form`;--> statement-breakpoint
CREATE UNIQUE INDEX `published_form_form_id_unique` ON `published_form` (`form_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `published_form_subdomain_unique` ON `published_form` (`subdomain`);