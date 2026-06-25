import { z } from 'zod'
import { fail, ok } from '@/api/response'
import type { Theme } from '@/domain/theme'
import type { ThemeRepository } from '@/repositories/theme-repository'
import type { ServiceResult } from '@/services/service-result'

export type { ServiceResult }

/** Input validation for creating a Theme (boundary validation, per rules). */
export const createThemeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
})

export type CreateThemeInput = z.infer<typeof createThemeSchema>

/**
 * Validate and persist a new Theme. Returns a 201 success envelope, or a 400
 * error envelope when input is invalid (nothing is persisted in that case).
 */
export async function createTheme(
  repository: ThemeRepository,
  input: unknown,
): Promise<ServiceResult<Theme>> {
  const parsed = createThemeSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { status: 400, body: fail(message) }
  }

  const theme = await repository.create({ title: parsed.data.title })
  return { status: 201, body: ok(theme) }
}

/**
 * Read a Theme by id. Returns a 200 success envelope, or a clean 404 error
 * envelope when no Theme matches.
 */
export async function getTheme(
  repository: ThemeRepository,
  id: string,
): Promise<ServiceResult<Theme>> {
  const theme = await repository.findById(id)
  if (!theme) {
    return { status: 404, body: fail('Theme not found') }
  }

  return { status: 200, body: ok(theme) }
}
