CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `form` ADD `workspace_id` text NOT NULL REFERENCES workspace(id);