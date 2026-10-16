import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// One random identifier per completed game; no account, IP, or device identifier.
export const learningPlays = sqliteTable('learning_plays', {
  id: text('id').primaryKey(),
  questionVersion: text('question_version').notNull(),
  completedAt: integer('completed_at').notNull(),
  warmup: text('warmup').notNull(),
  rounds: text('rounds').notNull(),
  strategy: text('strategy').notNull(),
}, table => [index('learning_recent_idx').on(table.questionVersion, table.completedAt)]);
