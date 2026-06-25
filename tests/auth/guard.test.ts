import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  classifyPrincipal,
  extractBearerToken,
  principalFromRequest,
  requireAdmin,
} from '@/auth/guard'

describe('classifyPrincipal', () => {
  it('classifies a request as admin when the presented token matches the configured admin token', () => {
    const principal = classifyPrincipal('s3cret-admin-token', 's3cret-admin-token')

    expect(principal).toBe('admin')
  })

  it('classifies a request as public when the presented token does not match', () => {
    const principal = classifyPrincipal('wrong-token', 's3cret-admin-token')

    expect(principal).toBe('public')
  })

  it('classifies a request as public when no credential is presented', () => {
    expect(classifyPrincipal(null, 's3cret-admin-token')).toBe('public')
    expect(classifyPrincipal(undefined, 's3cret-admin-token')).toBe('public')
  })

  it('fails closed: classifies as public when no admin token is configured, even with no credential', () => {
    expect(classifyPrincipal(undefined, undefined)).toBe('public')
    expect(classifyPrincipal(null, undefined)).toBe('public')
    expect(classifyPrincipal('any-token', undefined)).toBe('public')
  })
})

describe('extractBearerToken', () => {
  it('extracts the token from a Bearer Authorization header', () => {
    const request = new Request('https://cockpit.test/api/themes', {
      headers: { authorization: 'Bearer s3cret-admin-token' },
    })

    expect(extractBearerToken(request)).toBe('s3cret-admin-token')
  })

  it('returns null when the Authorization header is absent', () => {
    const request = new Request('https://cockpit.test/api/themes')

    expect(extractBearerToken(request)).toBeNull()
  })

  it('returns null when the Authorization header is not a Bearer scheme', () => {
    const request = new Request('https://cockpit.test/api/themes', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })

    expect(extractBearerToken(request)).toBeNull()
  })
})

describe('requireAdmin', () => {
  it('allows an admin principal by returning no denial', () => {
    expect(requireAdmin('admin')).toBeNull()
  })

  it('denies a public principal with a 401 standard error envelope', () => {
    const denial = requireAdmin('public')

    expect(denial).not.toBeNull()
    expect(denial?.status).toBe(401)
    expect(denial?.body.success).toBe(false)
    expect(denial?.body.error).toBeTruthy()
    expect(denial?.body.data).toBeUndefined()
  })

  it('leaks no internals in the denial message (no token, no principal details)', () => {
    const denial = requireAdmin('public')

    expect(denial?.body.error).toBe('Admin authentication required')
  })
})

describe('principalFromRequest', () => {
  const ADMIN_TOKEN = 's3cret-admin-token'
  let previous: string | undefined

  beforeEach(() => {
    previous = process.env.ADMIN_TOKEN
    process.env.ADMIN_TOKEN = ADMIN_TOKEN
  })

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ADMIN_TOKEN
    } else {
      process.env.ADMIN_TOKEN = previous
    }
  })

  it('resolves to admin when the request carries the configured admin token', () => {
    const request = new Request('https://cockpit.test/api/themes', {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    })

    expect(principalFromRequest(request)).toBe('admin')
  })

  it('resolves to public when the request carries no credential', () => {
    const request = new Request('https://cockpit.test/api/themes')

    expect(principalFromRequest(request)).toBe('public')
  })

  it('resolves to public when the request carries a wrong credential', () => {
    const request = new Request('https://cockpit.test/api/themes', {
      headers: { authorization: 'Bearer wrong-token' },
    })

    expect(principalFromRequest(request)).toBe('public')
  })
})
