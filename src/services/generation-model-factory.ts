import type { GenerationModel, GenerationResult } from '@/domain/generation'

/** Env var holding a JSON {@link GenerationResult} fixture, used only by the E2E. */
const FAKE_SCRIPT_ENV = 'GENERATION_FAKE_SCRIPT'

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
 * When `GENERATION_FAKE_SCRIPT` holds a JSON {@link GenerationResult}, the
 * factory returns an adapter that replays it. This is the **E2E seam** that lets
 * the deterministic fake (ADR-0021) drive a production build without bundling
 * test code: the fixture data lives in the test/config, and `src` only
 * deserializes it. The real Anthropic-backed adapter lands in #28; until then,
 * with no fixture and no key, a generation request fails closed with a 503
 * rather than the app failing to boot or a non-generation path breaking.
 */
export function getGenerationModel(): GenerationModel {
  const script = process.env[FAKE_SCRIPT_ENV]
  if (script && script.trim().length > 0) {
    return new FixtureGenerationModel(JSON.parse(script) as GenerationResult)
  }

  throw new GenerationNotConfiguredError()
}

/** Replays a fixed {@link GenerationResult} each turn; the E2E's stand-in adapter. */
class FixtureGenerationModel implements GenerationModel {
  constructor(private readonly fixture: GenerationResult) {}

  async generate(): Promise<GenerationResult> {
    return this.fixture
  }
}
