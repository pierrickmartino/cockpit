import { timingSafeEqual } from 'node:crypto'
import { fail, type ApiResponse } from '@/api/response'
import type { Principal } from '@/auth/principal'

/** A denial to return from a route when the principal is not permitted. */
export interface AuthDenial {
  status: number
  body: ApiResponse<never>
}

/** HTTP 401: the request lacked a valid admin credential. */
const UNAUTHORIZED = 401

/**
 * Classify a request principal from a presented credential against the
 * configured admin token. Pure and fail-closed: only a non-empty presented
 * credential that matches a configured non-empty admin token yields `admin`.
 * Everything else (mismatch, absent credential, unconfigured token) is
 * `public`, so a missing `ADMIN_TOKEN` can never accidentally grant access.
 */
export function classifyPrincipal(
  presented: string | null | undefined,
  adminToken: string | undefined,
): Principal {
  if (!adminToken || !presented) {
    return 'public'
  }

  return constantTimeEquals(presented, adminToken) ? 'admin' : 'public'
}

/**
 * Gate an authoring/generation/publish action behind the admin boundary.
 * Returns `null` when the principal is `admin` (proceed), or a clean 401
 * denial otherwise. The message is deliberately generic so denials never leak
 * the configured token, the presented credential, or any internal detail.
 */
export function requireAdmin(principal: Principal): AuthDenial | null {
  if (principal === 'admin') {
    return null
  }

  return { status: UNAUTHORIZED, body: fail('Admin authentication required') }
}

/**
 * Resolve the principal for an incoming request: read the Bearer credential
 * and classify it against the `ADMIN_TOKEN` secret (env only, never hardcoded).
 * This is the single adapter that bridges HTTP + config into the pure
 * classification logic, so route handlers stay thin.
 */
export function principalFromRequest(request: Request): Principal {
  return classifyPrincipal(extractBearerToken(request), process.env.ADMIN_TOKEN)
}

const BEARER_PREFIX = 'Bearer '

/**
 * Pull the credential out of a `Authorization: Bearer <token>` header.
 * Returns `null` when the header is absent or uses a different scheme.
 */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null
  }

  const token = header.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Compare two secrets without leaking their relationship through timing.
 * Length is compared first (cheap, and `timingSafeEqual` requires equal-length
 * buffers); equal-length values are then compared in constant time.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const aBytes = Buffer.from(a)
  const bBytes = Buffer.from(b)
  if (aBytes.length !== bBytes.length) {
    return false
  }

  return timingSafeEqual(aBytes, bBytes)
}
