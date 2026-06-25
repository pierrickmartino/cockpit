import { doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

/**
 * Actors and flows are the normalized authoring source of truth for a theme's
 * working structure (ADR-0006); a flow is a row with from/to actor ids. Deleting
 * a theme cascades to its structure, and deleting an actor cascades to its flows.
 */
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  themeId: uuid('theme_id')
    .notNull()
    .references(() => themes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  actorKey: text('actor_key').notNull(),
  tier: text('tier'),
  location: text('location'),
  // Accept-gate review status (ADR-0004); elements enter as 'proposed'.
  status: text('status').notNull().default('proposed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ActorRow = typeof actors.$inferSelect

export const flows = pgTable('flows', {
  id: uuid('id').primaryKey().defaultRandom(),
  themeId: uuid('theme_id')
    .notNull()
    .references(() => themes.id, { onDelete: 'cascade' }),
  fromActorId: uuid('from_actor_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),
  toActorId: uuid('to_actor_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),
  // Normalised [0, 1] dependency weight; range is enforced at the service boundary.
  substitutability: doublePrecision('substitutability').notNull(),
  // Accept-gate review status (ADR-0004); elements enter as 'proposed'.
  status: text('status').notNull().default('proposed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type FlowRow = typeof flows.$inferSelect
