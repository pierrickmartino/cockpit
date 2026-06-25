import { NextResponse } from 'next/server'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import { getStructureRepository } from '@/repositories/factory'
import { addActor } from '@/services/structure-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  // Authoring is admin-only (ADR-0009): gate before touching input or storage.
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  const { id } = await context.params
  const input = await request.json().catch(() => null)
  const result = await addActor(getStructureRepository(), id, input)
  return NextResponse.json(result.body, { status: result.status })
}
