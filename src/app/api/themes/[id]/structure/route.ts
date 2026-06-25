import { NextResponse } from 'next/server'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import { getStructureRepository } from '@/repositories/factory'
import { getWorkingStructure } from '@/services/structure-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  // The working state is the Admin's pre-publish surface; viewers only ever see
  // published snapshots, so reading it is admin-only too (ADR-0009/0012).
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  const { id } = await context.params
  const result = await getWorkingStructure(getStructureRepository(), id)
  return NextResponse.json(result.body, { status: result.status })
}
