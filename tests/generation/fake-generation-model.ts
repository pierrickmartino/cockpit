import type {
  GenerationModel,
  GenerationRequest,
  GenerationResult,
} from '@/domain/generation'

/**
 * Deterministic test double for `GenerationModel` (ADR-0021: the fake lives in
 * `tests/`, never `src/` — there is no product need for an offline generator).
 * Returns a canned `GenerationResult`, or one computed from the request when a
 * test needs to react to the working structure it was fed. Records the last
 * request so tests can assert the service handed it the current structure.
 */
export class FakeGenerationModel implements GenerationModel {
  public lastRequest: GenerationRequest | null = null

  constructor(
    private readonly canned:
      | GenerationResult
      | ((request: GenerationRequest) => GenerationResult),
  ) {}

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.lastRequest = request
    return typeof this.canned === 'function' ? this.canned(request) : this.canned
  }
}

/** A `GenerationModel` whose every turn fails, to exercise the retryable path. */
export class ThrowingGenerationModel implements GenerationModel {
  async generate(): Promise<GenerationResult> {
    throw new Error('upstream model unavailable')
  }
}
