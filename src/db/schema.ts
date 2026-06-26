import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import type { Citation } from '@/domain/citation'

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
  // Per-claim citations (ADR-0021); jsonb because they are only ever read with
  // their owning element and are frozen into the snapshot jsonb anyway.
  citations: jsonb('citations').$type<Citation[]>().notNull().default([]),
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
  // Per-claim citations (ADR-0021); jsonb for the same reasons as on actors.
  citations: jsonb('citations').$type<Citation[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type FlowRow = typeof flows.$inferSelect

/**
 * Published snapshots: the immutable, frozen jsonb read model Viewers consume
 * (ADR-0012). One row per published version of a theme; `content` holds the
 * frozen structure + computed power + placeholders. Snapshots are append-only —
 * publishing inserts a new version and never updates a prior row. The unique
 * (theme_id, version) constraint enforces a single, gap-free version sequence.
 */
export const publishedSnapshots = pgTable(
  'published_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    themeId: uuid('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    themeVersionUnique: unique('published_snapshots_theme_version_unique').on(
      table.themeId,
      table.version,
    ),
  }),
)

export type PublishedSnapshotRow = typeof publishedSnapshots.$inferSelect
