import { NextResponse } from 'next/server'
import { fail } from '@/api/response'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import type { GenerationModel } from '@/domain/generation'
import { getStructureRepository } from '@/repositories/factory'
import {
  GenerationNotConfiguredError,
  getGenerationModel,
} from '@/services/generation-model-factory'
import { generateTurn } from '@/services/generation-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** HTTP 503: a generation request arrived but no model adapter is configured. */
const SERVICE_UNAVAILABLE = 503

/**
 * Run one generation turn for a theme. Admin-only (ADR-0009): it spends model
 * budget and changes what the Admin will review. Returns
 * `{ reply, proposals, report }` in the standard `ApiResponse` envelope.
 */
export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const denial = requireAdmin(principalFromRequest(request))
  if (denial) {
    return NextResponse.json(denial.body, { status: denial.status })
  }

  let model: GenerationModel
  try {
    model = getGenerationModel()
  } catch (error) {
    if (error instanceof GenerationNotConfiguredError) {
      return NextResponse.json(fail('Generation is not configured'), {
        status: SERVICE_UNAVAILABLE,
      })
    }
    throw error
  }

  const { id } = await context.params
  const input = await request.json().catch(() => null)
  const result = await generateTurn(getStructureRepository(), model, id, input)
  return NextResponse.json(result.body, { status: result.status })
}
