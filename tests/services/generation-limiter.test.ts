import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_RATE_CAPACITY,
  GenerationLimiter,
  generationLimitsFromEnv,
  InFlightGuard,
  TokenBucket,
} from '@/services/generation-limiter'

/** A hand-cranked clock so bucket refill is asserted deterministically (ADR-0021). */
function fakeClock(start = 0): { clock: { now: () => number }; advance: (ms: number) => void } {
  let current = start
  return {
    clock: { now: () => current },
    advance(ms: number) {
      current += ms
    },
  }
}

describe('TokenBucket', () => {
  it('admits the first request when a token is available', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 }, clock)

    expect(bucket.tryConsume('admin')).toBe(true)
  })

  it('rejects once the burst capacity is exhausted without refill', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 3, refillTokens: 1, refillIntervalMs: 1000 }, clock)

    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(false)
  })

  it('refills tokens as the injected clock advances', () => {
    const { clock, advance } = fakeClock()
    const bucket = new TokenBucket({ capacity: 2, refillTokens: 1, refillIntervalMs: 1000 }, clock)

    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(false)

    advance(1000)
    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(false)
  })

  it('never refills beyond capacity even after a long idle period', () => {
    const { clock, advance } = fakeClock()
    const bucket = new TokenBucket({ capacity: 2, refillTokens: 1, refillIntervalMs: 1000 }, clock)

    advance(10_000)

    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(false)
  })

  it('keys buckets independently so one principal cannot drain another', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 }, clock)

    expect(bucket.tryConsume('admin')).toBe(true)
    expect(bucket.tryConsume('admin')).toBe(false)
    expect(bucket.tryConsume('other')).toBe(true)
  })
})

describe('InFlightGuard', () => {
  it('admits a request up to the configured concurrency', () => {
    const guard = new InFlightGuard(1)

    expect(guard.tryAcquire('admin')).toBe(true)
  })

  it('rejects a second in-flight request before the first is released', () => {
    const guard = new InFlightGuard(1)

    expect(guard.tryAcquire('admin')).toBe(true)
    expect(guard.tryAcquire('admin')).toBe(false)
  })

  it('admits again once the in-flight slot is released', () => {
    const guard = new InFlightGuard(1)

    expect(guard.tryAcquire('admin')).toBe(true)
    guard.release('admin')
    expect(guard.tryAcquire('admin')).toBe(true)
  })

  it('keys concurrency independently so one principal does not block another', () => {
    const guard = new InFlightGuard(1)

    expect(guard.tryAcquire('admin')).toBe(true)
    expect(guard.tryAcquire('other')).toBe(true)
  })
})

describe('GenerationLimiter', () => {
  function limiter(): GenerationLimiter {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 }, clock)
    return new GenerationLimiter(bucket, new InFlightGuard(1))
  }

  it('admits a request when rate and concurrency both allow it', () => {
    const admission = limiter().tryAdmit('admin')

    expect(admission.ok).toBe(true)
  })

  it('rejects with reason "rate" when the token bucket is exhausted', () => {
    const guard = limiter()
    guard.tryAdmit('admin').release()

    const admission = guard.tryAdmit('admin')

    expect(admission.ok).toBe(false)
    expect(admission.reason).toBe('rate')
  })

  it('does not hold an in-flight slot when it rejects on rate', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 }, clock)
    const inFlight = new InFlightGuard(1)
    const guard = new GenerationLimiter(bucket, inFlight)

    guard.tryAdmit('admin').release()
    guard.tryAdmit('admin') // rejected on rate — must not consume a concurrency slot

    expect(inFlight.tryAcquire('admin')).toBe(true)
  })

  it('rejects a concurrent request with reason "concurrency" while one is in flight', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 }, clock)
    const guard = new GenerationLimiter(bucket, new InFlightGuard(1))

    const first = guard.tryAdmit('admin')
    const second = guard.tryAdmit('admin')

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('concurrency')
  })

  it('admits again after the in-flight admission is released', () => {
    const { clock } = fakeClock()
    const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 }, clock)
    const guard = new GenerationLimiter(bucket, new InFlightGuard(1))

    const first = guard.tryAdmit('admin')
    first.release()

    expect(guard.tryAdmit('admin').ok).toBe(true)
  })
})

describe('generationLimitsFromEnv', () => {
  it('falls back to the constant defaults when env is unset', () => {
    const limits = generationLimitsFromEnv({})

    expect(limits.bucket.capacity).toBe(DEFAULT_RATE_CAPACITY)
    expect(limits.maxConcurrent).toBe(DEFAULT_MAX_CONCURRENT)
  })

  it('reads positive integer overrides from env', () => {
    const limits = generationLimitsFromEnv({
      GENERATION_RATE_CAPACITY: '10',
      GENERATION_RATE_REFILL_TOKENS: '2',
      GENERATION_RATE_REFILL_INTERVAL_MS: '30000',
      GENERATION_MAX_CONCURRENT: '3',
    })

    expect(limits.bucket).toEqual({ capacity: 10, refillTokens: 2, refillIntervalMs: 30000 })
    expect(limits.maxConcurrent).toBe(3)
  })

  it('ignores non-numeric and non-positive overrides, keeping the default', () => {
    const limits = generationLimitsFromEnv({
      GENERATION_RATE_CAPACITY: 'abc',
      GENERATION_MAX_CONCURRENT: '0',
    })

    expect(limits.bucket.capacity).toBe(DEFAULT_RATE_CAPACITY)
    expect(limits.maxConcurrent).toBe(DEFAULT_MAX_CONCURRENT)
  })
})
