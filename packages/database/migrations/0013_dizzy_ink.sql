CREATE TABLE `form_template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`data` text,
	`customizations` text,
	`creator_id` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
