CREATE TABLE `learning_plays` (
	`id` text PRIMARY KEY NOT NULL,
	`question_version` text NOT NULL,
	`completed_at` integer NOT NULL,
	`warmup` text NOT NULL,
	`rounds` text NOT NULL,
	`strategy` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learning_recent_idx` ON `learning_plays` (`question_version`,`completed_at`);