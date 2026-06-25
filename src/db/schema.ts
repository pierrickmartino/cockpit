import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Authoring table for Themes. The published jsonb read model (ADR-0006/0012) is
 * added by later slices; the walking skeleton persists only the working Theme.
 */
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  state: text('state').notNull().default('working'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ThemeRow = typeof themes.$inferSelect
