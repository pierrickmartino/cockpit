import type { GenerationModel } from '@/domain/generation'

/**
 * Raised when a generation request arrives but no model adapter is wired. The
 * route catches this and returns a generic `503 "Generation is not configured"`
 * (no key, no stack) so the app still boots and every non-generation path works
 * without a model (ADR-0021).
 */
export class GenerationNotConfiguredError extends Error {
  constructor() {
    super('Generation is not configured')
    this.name = 'GenerationNotConfiguredError'
  }
}

/**
 * Resolve the generation model adapter for route handlers, read **lazily and
 * fail-closed**: it is constructed only when a generation request asks for it.
 *
 * The real Anthropic-backed adapter lands in #28; until then no model is wired,
 * so a generation request fails closed with a 503 rather than the app failing to
 * boot or a non-generation path breaking.
 */
export function getGenerationModel(): GenerationModel {
  throw new GenerationNotConfiguredError()
}
