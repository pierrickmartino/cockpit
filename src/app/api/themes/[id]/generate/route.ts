import { NextResponse } from 'next/server'
import { fail } from '@/api/response'
import { principalFromRequest, requireAdmin } from '@/auth/guard'
import type { GenerationModel } from '@/domain/generation'
import { getStructureRepository } from '@/repositories/factory'
import type { AdmissionDenial } from '@/services/generation-limiter'
import { getGenerationLimiter } from '@/services/generation-limiter'
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

/** HTTP 429: an admitted-but-over-budget request the caller may safely retry. */
const TOO_MANY_REQUESTS = 429

/**
 * Budget protection is keyed by the admin principal — the only one that reaches
 * here past `requireAdmin` (ADR-0009). v1 has a single admin, so one key.
 */
const ADMIN_KEY = 'admin'

/** Retryable, detail-free messages for an over-budget request (ADR-0021). */
const DENIAL_MESSAGES: Record<AdmissionDenial, string> = {
  rate: 'Generation rate limit reached, please retry shortly',
  concurrency: 'A generation is already running, please retry shortly',
}

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

  // Best-effort, in-process budget protection (ADR-0009, ADR-0021): the token
  // bucket caps sustained spend and the in-flight guard kills the double-submit /
  // runaway-loop case. Over-budget requests get a clean, retryable 429.
  const admission = getGenerationLimiter().tryAdmit(ADMIN_KEY)
  if (!admission.ok) {
    return NextResponse.json(fail(DENIAL_MESSAGES[admission.reason ?? 'rate']), {
      status: TOO_MANY_REQUESTS,
    })
  }

  try {
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
  } finally {
    admission.release()
  }
}
