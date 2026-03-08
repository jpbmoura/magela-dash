ALTER TABLE `users` DROP INDEX `users_open_id_unique`;--> statement-breakpoint
ALTER TABLE `produtos` ADD `estoque_total` int;--> statement-breakpoint
ALTER TABLE `users` ADD `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `loginMethod` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` ADD `lastSignedIn` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_openId_unique` UNIQUE(`openId`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `open_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `login_method`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `last_signed_in`;