import { NextResponse } from 'next/server'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import { getStructureRepository } from '@/repositories/factory'
import { reviewStructure } from '@/services/structure-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  // Reviewing proposals is an authoring action — admin-only (ADR-0009).
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  const { id } = await context.params
  const input = await request.json().catch(() => null)
  const result = await reviewStructure(getStructureRepository(), id, input)
  return NextResponse.json(result.body, { status: result.status })
}
