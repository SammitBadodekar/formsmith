CREATE TABLE `form` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`image` text,
	`logo` text,
	`user_id` text NOT NULL,
	`data` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `token_expires_at`;