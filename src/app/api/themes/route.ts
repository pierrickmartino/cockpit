import { NextResponse } from 'next/server'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import { getThemeRepository } from '@/repositories/factory'
import { createTheme } from '@/services/theme-service'

export async function POST(request: Request): Promise<NextResponse> {
  // Authoring is admin-only (ADR-0009): gate before touching input or storage.
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  const input = await request.json().catch(() => null)
  const result = await createTheme(getThemeRepository(), input)
  return NextResponse.json(result.body, { status: result.status })
}
