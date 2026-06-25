import { NextResponse } from 'next/server'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import { getSnapshotRepository, getStructureRepository } from '@/repositories/factory'
import { publishTheme } from '@/services/snapshot-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  // Publishing promotes the accepted working state to the viewer-facing
  // snapshot — an authoring action, so admin-only (ADR-0009).
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  const { id } = await context.params
  const result = await publishTheme(getStructureRepository(), getSnapshotRepository(), id)
  return NextResponse.json(result.body, { status: result.status })
}
