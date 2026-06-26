/**
 * Best-effort, in-process budget protection for the generation route (ADR-0009,
 * ADR-0021). The threat at the single-admin v1 boundary is not abuse-by-many —
 * it is *runaway model spend*: a stuck retry loop, an accidental double-submit,
 * or rapid-fire turns. Two guards, both keyed by the admin principal:
 *
 *   - {@link TokenBucket} caps the sustained request rate.
 *   - {@link InFlightGuard} rejects a second generation while one is running —
 *     this is what actually kills the double-submit / runaway-loop case.
 *
 * Limiting is **best-effort per instance**: state lives in process memory, so a
 * multi-instance deployment would not share a budget. That is honest for the
 * single-admin boundary (ADR-0009). If the boundary ever widens, the hardening
 * path is a Postgres-backed hard limiter, not a bigger in-memory bucket.
 */

/** Wall-clock source, injected so bucket refill is unit-testable deterministically. */
export interface Clock {
  now(): number
}

/** Production clock backed by `Date.now()`. */
export const systemClock: Clock = {
  now: () => Date.now(),
}

/** Token-bucket shape: a burst {@link capacity}, refilled {@link refillTokens} every interval. */
export interface TokenBucketConfig {
  capacity: number
  refillTokens: number
  refillIntervalMs: number
}

interface BucketState {
  tokens: number
  lastRefill: number
}

/**
 * A per-key token bucket: each key (the admin principal) gets an independent
 * bucket of {@link TokenBucketConfig.capacity} tokens that refills continuously
 * at `refillTokens / refillIntervalMs`. `tryConsume` refills based on elapsed
 * clock time, then takes one token if any remain.
 */
export class TokenBucket {
  private readonly buckets = new Map<string, BucketState>()

  constructor(
    private readonly config: TokenBucketConfig,
    private readonly clock: Clock = systemClock,
  ) {}

  /** Take one token for `key`, refilling first. Returns false when the bucket is empty. */
  tryConsume(key: string): boolean {
    const refilled = this.refill(
      this.buckets.get(key) ?? { tokens: this.config.capacity, lastRefill: this.clock.now() },
    )

    if (refilled.tokens < 1) {
      this.buckets.set(key, refilled)
      return false
    }

    this.buckets.set(key, { ...refilled, tokens: refilled.tokens - 1 })
    return true
  }

  /**
   * Add the tokens earned since `lastRefill` at `refillTokens / refillIntervalMs`,
   * capped at {@link TokenBucketConfig.capacity}. Whole intervals only, so
   * `lastRefill` advances by the consumed intervals and fractional progress is
   * carried forward rather than lost.
   */
  private refill(state: BucketState): BucketState {
    const elapsed = this.clock.now() - state.lastRefill
    const intervals = Math.floor(elapsed / this.config.refillIntervalMs)
    if (intervals < 1) {
      return state
    }

    const tokens = Math.min(
      this.config.capacity,
      state.tokens + intervals * this.config.refillTokens,
    )
    return { tokens, lastRefill: state.lastRefill + intervals * this.config.refillIntervalMs }
  }
}

/**
 * A per-key cap on *concurrent* in-flight work. `tryAcquire` takes a slot when
 * fewer than {@link maxConcurrent} are active for the key; the caller must
 * `release` it in a `finally`. This is the guard that kills the double-submit /
 * runaway-loop case: a second generation cannot start while one is running.
 */
export class InFlightGuard {
  private readonly active = new Map<string, number>()

  constructor(private readonly maxConcurrent: number) {}

  /** Take an in-flight slot for `key`; false when the key is already at capacity. */
  tryAcquire(key: string): boolean {
    const current = this.active.get(key) ?? 0
    if (current >= this.maxConcurrent) {
      return false
    }

    this.active.set(key, current + 1)
    return true
  }

  /** Free one in-flight slot for `key`. Never drops below zero. */
  release(key: string): void {
    const current = this.active.get(key) ?? 0
    if (current <= 1) {
      this.active.delete(key)
      return
    }

    this.active.set(key, current - 1)
  }
}

/** Why an admission was refused — drives the route's retryable error message. */
export type AdmissionDenial = 'rate' | 'concurrency'

/**
 * The outcome of {@link GenerationLimiter.tryAdmit}. An admitted request carries
 * a `release` the route must call in a `finally`; a denied one carries the
 * `reason` and a no-op `release` so callers can treat both shapes uniformly.
 */
export interface Admission {
  ok: boolean
  reason?: AdmissionDenial
  release(): void
}

const NO_OP_RELEASE = (): void => {}

/**
 * Composes the two guards into a single admission decision for the generation
 * route. Rate is checked first (cheap, and a rate-denied request must not hold a
 * concurrency slot); only an admitted request takes an in-flight slot, returned
 * as `release`.
 */
export class GenerationLimiter {
  constructor(
    private readonly bucket: TokenBucket,
    private readonly inFlight: InFlightGuard,
  ) {}

  /** Decide whether `key` may run a generation turn now. */
  tryAdmit(key: string): Admission {
    if (!this.bucket.tryConsume(key)) {
      return { ok: false, reason: 'rate', release: NO_OP_RELEASE }
    }

    if (!this.inFlight.tryAcquire(key)) {
      return { ok: false, reason: 'concurrency', release: NO_OP_RELEASE }
    }

    let released = false
    return {
      ok: true,
      release: () => {
        if (released) {
          return
        }
        released = true
        this.inFlight.release(key)
      },
    }
  }
}

/**
 * Default limits, tuned for one Admin authoring interactively. Five-turn burst
 * refilling one token every 12s caps sustained spend at ~5 turns/min, and a
 * single in-flight slot makes a double-submit or runaway loop wait for the
 * turn in progress. All four are env-overridable for ops tuning.
 */
export const DEFAULT_RATE_CAPACITY = 5
export const DEFAULT_RATE_REFILL_TOKENS = 1
export const DEFAULT_RATE_REFILL_INTERVAL_MS = 12_000
export const DEFAULT_MAX_CONCURRENT = 1

/** The resolved limits used to build the {@link GenerationLimiter}. */
export interface GenerationLimits {
  bucket: TokenBucketConfig
  maxConcurrent: number
}

/** Read a positive integer env override, falling back to `fallback` on absent/invalid input. */
function positiveIntEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback
  }

  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/**
 * Resolve generation limits from environment overrides, defaulting to the
 * `DEFAULT_*` constants. Pure in its `env` argument so it is unit-testable
 * without touching `process.env`.
 */
export function generationLimitsFromEnv(
  env: Record<string, string | undefined> = process.env,
): GenerationLimits {
  return {
    bucket: {
      capacity: positiveIntEnv(env.GENERATION_RATE_CAPACITY, DEFAULT_RATE_CAPACITY),
      refillTokens: positiveIntEnv(env.GENERATION_RATE_REFILL_TOKENS, DEFAULT_RATE_REFILL_TOKENS),
      refillIntervalMs: positiveIntEnv(
        env.GENERATION_RATE_REFILL_INTERVAL_MS,
        DEFAULT_RATE_REFILL_INTERVAL_MS,
      ),
    },
    maxConcurrent: positiveIntEnv(env.GENERATION_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
  }
}

let limiterSingleton: GenerationLimiter | undefined

/**
 * The per-instance {@link GenerationLimiter} the generation route shares across
 * requests, built once from {@link generationLimitsFromEnv}. State is in-process,
 * so protection is best-effort per instance — honest for the single-admin
 * boundary (ADR-0009); a Postgres-backed limiter is the hardening path if it
 * ever widens. Uses the {@link systemClock} in production; the route is the only
 * caller, and unit tests construct {@link GenerationLimiter} directly with a fake.
 */
export function getGenerationLimiter(): GenerationLimiter {
  if (!limiterSingleton) {
    const limits = generationLimitsFromEnv()
    limiterSingleton = new GenerationLimiter(
      new TokenBucket(limits.bucket),
      new InFlightGuard(limits.maxConcurrent),
    )
  }

  return limiterSingleton
}
