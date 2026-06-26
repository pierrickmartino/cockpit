import { z } from 'zod'
import { fail, ok } from '@/api/response'
import type { Actor } from '@/domain/actor'
import { resolveEndpoints } from '@/domain/endpoint-resolution'
import type {
  GenerationModel,
  GenerationReport,
  GenerationTurnResult,
  ProposedActor,
} from '@/domain/generation'
import { applyActorGroundingFloor, applyFlowGroundingFloor } from '@/domain/grounding-floor'
import type { StructureRepository } from '@/repositories/structure-repository'
import type { ServiceResult } from '@/services/service-result'

/**
 * Boundary validation for a generation turn. The client holds the conversation
 * transcript and sends it each turn (ADR-0021); the server is stateless. A turn
 * needs at least one message — the Admin's latest — to act on.
 */
export const generateSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['admin', 'model'], { message: 'Message role must be admin or model' }),
        text: z.string().trim().min(1, 'Message text is required'),
      }),
    )
    .min(1, 'At least one message is required'),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

/**
 * Orchestrate one generation turn against a fixed `GenerationModel` (issue #26,
 * ADR-0021):
 *
 *   1. Feed the model the conversation and the theme's current working structure.
 *   2. Apply the grounding floor — drop any actor/flow whose existence claim
 *      (`relevance`/`dependency`) lacks a citation.
 *   3. Persist surviving actors through the *existing* `addActor` repository path
 *      so they land `proposed` via one code path, reusing an existing actor by
 *      `actorKey` rather than duplicating it.
 *   4. Build a ref → UUID map and resolve flow endpoints; persist resolvable
 *      flows, dropping any whose endpoint will not resolve (best-effort).
 *   5. Return the surviving proposals plus a per-turn report of what landed and
 *      what was dropped.
 *
 * A turn may legitimately propose nothing (dialogue/steering) — that is not an
 * error. A failed (model threw) or empty turn persists nothing.
 */
export async function generateTurn(
  repository: StructureRepository,
  model: GenerationModel,
  themeId: string,
  input: unknown,
): Promise<ServiceResult<GenerationTurnResult>> {
  const parsed = generateSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 400, body: fail(firstIssue(parsed.error)) }
  }

  // The current working structure feeds the model and provides actorKey reuse.
  const [existingActors, existingFlows] = await Promise.all([
    repository.listActors(themeId),
    repository.listFlows(themeId),
  ])

  let result
  try {
    result = await model.generate({
      themeId,
      messages: parsed.data.messages,
      structure: { actors: existingActors, flows: existingFlows },
    })
  } catch {
    // Live-call failures persist nothing; surface a retryable error (ADR-0021).
    return { status: 502, body: fail('Generation failed, please retry') }
  }

  const groundedActors = applyActorGroundingFloor(result.proposedActors)
  const groundedFlows = applyFlowGroundingFloor(result.proposedFlows)

  // Persist surviving actors, reusing existing actors by actorKey. Each ref the
  // model used (and the actor's name/key) maps to the persisted-or-reused UUID,
  // so flows can resolve endpoints whether they point at a new or existing actor.
  const existingByKey = new Map(existingActors.map((actor) => [actor.actorKey, actor]))
  const refToActorId = new Map<string, string>()
  for (const actor of existingActors) {
    refToActorId.set(actor.actorKey, actor.id)
    refToActorId.set(actor.name, actor.id)
  }

  const addedActors: Actor[] = []
  const reusedActors: string[] = []
  for (const proposed of groundedActors.surviving) {
    const existing = existingByKey.get(proposed.actorKey)
    if (existing) {
      reusedActors.push(existing.name)
      mapActorRefs(refToActorId, proposed, existing.id)
      continue
    }

    const actor = await repository.addActor({
      themeId,
      name: proposed.name,
      kind: proposed.kind,
      actorKey: proposed.actorKey,
      tier: proposed.tier ?? null,
      location: proposed.location ?? null,
      citations: proposed.citations,
    })
    addedActors.push(actor)
    mapActorRefs(refToActorId, proposed, actor.id)
  }

  const { resolved, dropped: droppedUnresolvable } = resolveEndpoints(
    groundedFlows.surviving,
    refToActorId,
  )

  const addedFlows = []
  for (const flow of resolved) {
    addedFlows.push(
      await repository.addFlow({
        themeId,
        fromActorId: flow.fromActorId,
        toActorId: flow.toActorId,
        substitutability: flow.substitutability,
        citations: flow.citations,
      }),
    )
  }

  const report: GenerationReport = {
    addedActors: addedActors.map((actor) => actor.name),
    reusedActors,
    addedFlows: addedFlows.length,
    droppedActors: groundedActors.dropped,
    droppedFlows: [...groundedFlows.dropped, ...droppedUnresolvable],
  }

  return {
    status: 200,
    body: ok({
      reply: result.reply,
      proposals: { actors: addedActors, flows: addedFlows },
      report,
    }),
  }
}

/** Map every reference a flow might use for this actor to its persisted UUID. */
function mapActorRefs(
  refToActorId: Map<string, string>,
  proposed: ProposedActor,
  actorId: string,
): void {
  refToActorId.set(proposed.ref, actorId)
  refToActorId.set(proposed.name, actorId)
  refToActorId.set(proposed.actorKey, actorId)
}
