import { eq } from 'drizzle-orm'
import type { Database } from '@/db/client'
import { themes, type ThemeRow } from '@/db/schema'
import type { NewTheme, Theme, ThemeState } from '@/domain/theme'
import type { ThemeRepository } from '@/repositories/theme-repository'

/** Postgres-backed ThemeRepository. Verified by the shared contract suite. */
export class PostgresThemeRepository implements ThemeRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewTheme): Promise<Theme> {
    const [row] = await this.db
      .insert(themes)
      .values({ title: input.title })
      .returning()
    return toTheme(row)
  }

  async findById(id: string): Promise<Theme | null> {
    const [row] = await this.db
      .select()
      .from(themes)
      .where(eq(themes.id, id))
      .limit(1)
    return row ? toTheme(row) : null
  }
}

function toTheme(row: ThemeRow): Theme {
  return {
    id: row.id,
    title: row.title,
    state: row.state as ThemeState,
    createdAt: row.createdAt,
  }
}
