import { z } from 'zod'
import { fail, ok } from '@/api/response'
import { applyReview, type ReviewAction } from '@/domain/accept-gate'
import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { WorkingStructure } from '@/domain/structure'
import type { StructureRepository } from '@/repositories/structure-repository'
import type { ServiceResult } from '@/services/service-result'

/**
 * An optional free-text label: trimmed to its content, or `null` when blank or
 * absent. Keeps empty form fields from persisting as empty strings.
 */
const optionalLabel = z.preprocess(
  (value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null),
  z.string().nullable(),
)

/** Boundary validation for adding an Actor to a theme's working state. */
export const addActorSchema = z.object({
  name: z.string().trim().min(1, 'Actor name is required'),
  kind: z.enum(['place', 'point'], { message: 'Actor kind must be place or point' }),
  actorKey: z.string().trim().min(1, 'Actor key is required'),
  tier: optionalLabel,
  location: optionalLabel,
})

/**
 * Boundary validation for adding a Flow. `substitutability` is the normalised
 * [0, 1] dependency weight; a flow must connect two distinct actors. Whether
 * those actors actually exist in the theme is checked against the repository in
 * `addFlow`, since the schema cannot reach storage.
 */
export const addFlowSchema = z
  .object({
    fromActorId: z.string().uuid('Flow endpoints must be valid actors'),
    toActorId: z.string().uuid('Flow endpoints must be valid actors'),
    substitutability: z
      .number({ message: 'Substitutability must be a number' })
      .min(0, 'Substitutability must be between 0 and 1')
      .max(1, 'Substitutability must be between 0 and 1'),
  })
  .refine((flow) => flow.fromActorId !== flow.toActorId, {
    message: 'A flow must connect two different actors',
    path: ['toActorId'],
  })

/** Boundary validation for an Admin review: a non-empty batch of decisions. */
export const reviewSchema = z.object({
  actions: z
    .array(
      z.object({
        target: z.enum(['actor', 'flow'], { message: 'Review target must be actor or flow' }),
        id: z.string().uuid('Review target must be a valid id'),
        decision: z.enum(['accept', 'reject'], { message: 'Decision must be accept or reject' }),
      }),
    )
    .min(1, 'At least one review action is required'),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

/**
 * Validate and add an Actor to a theme's working state. Returns a 201 success
 * envelope, or a 400 error envelope when input is invalid (nothing persisted).
 */
export async function addActor(
  repository: StructureRepository,
  themeId: string,
  input: unknown,
): Promise<ServiceResult<Actor>> {
  const parsed = addActorSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 400, body: fail(firstIssue(parsed.error)) }
  }

  const actor = await repository.addActor({
    themeId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    actorKey: parsed.data.actorKey,
    tier: parsed.data.tier,
    location: parsed.data.location,
  })
  return { status: 201, body: ok(actor) }
}

/**
 * Validate and add a Flow to a theme's working state. Beyond shape validation,
 * both endpoints must be actors that already exist in this theme; otherwise a
 * 400 error envelope is returned and nothing is persisted.
 */
export async function addFlow(
  repository: StructureRepository,
  themeId: string,
  input: unknown,
): Promise<ServiceResult<Flow>> {
  const parsed = addFlowSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 400, body: fail(firstIssue(parsed.error)) }
  }

  const actorIds = new Set((await repository.listActors(themeId)).map((actor) => actor.id))
  if (!actorIds.has(parsed.data.fromActorId) || !actorIds.has(parsed.data.toActorId)) {
    return { status: 400, body: fail('Flow endpoints must be actors in this theme') }
  }

  const flow = await repository.addFlow({
    themeId,
    fromActorId: parsed.data.fromActorId,
    toActorId: parsed.data.toActorId,
    substitutability: parsed.data.substitutability,
  })
  return { status: 201, body: ok(flow) }
}

/**
 * Read a theme's current working structure (actors + flows) for the workbench
 * preview. Always a 200 success envelope; an empty theme yields empty arrays.
 */
export async function getWorkingStructure(
  repository: StructureRepository,
  themeId: string,
): Promise<ServiceResult<WorkingStructure>> {
  const [actors, flows] = await Promise.all([
    repository.listActors(themeId),
    repository.listFlows(themeId),
  ])
  return { status: 200, body: ok({ actors, flows }) }
}

/**
 * Apply an Admin's accept/reject decisions to a theme's working structure
 * through the pure accept-gate (ADR-0004) and persist the resulting statuses.
 * Every action must target an element that exists in this theme; otherwise a
 * 400 is returned and nothing is persisted. Returns the updated working
 * structure (with statuses) so the workbench can refresh its review queue and
 * accepted-only preview.
 */
export async function reviewStructure(
  repository: StructureRepository,
  themeId: string,
  input: unknown,
): Promise<ServiceResult<WorkingStructure>> {
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 400, body: fail(firstIssue(parsed.error)) }
  }

  const [actors, flows] = await Promise.all([
    repository.listActors(themeId),
    repository.listFlows(themeId),
  ])

  const actorIds = new Set(actors.map((actor) => actor.id))
  const flowIds = new Set(flows.map((flow) => flow.id))
  const targetsKnownElement = (action: ReviewAction): boolean =>
    action.target === 'actor' ? actorIds.has(action.id) : flowIds.has(action.id)
  if (!parsed.data.actions.every(targetsKnownElement)) {
    return { status: 400, body: fail('Review target must be an element in this theme') }
  }

  const next = applyReview({ actors, flows }, parsed.data.actions)

  // Persist only the elements whose status the decisions actually changed.
  const actorStatusBefore = new Map(actors.map((actor) => [actor.id, actor.status]))
  const flowStatusBefore = new Map(flows.map((flow) => [flow.id, flow.status]))
  await Promise.all([
    ...next.actors
      .filter((actor) => actor.status !== actorStatusBefore.get(actor.id))
      .map((actor) => repository.setActorStatus(themeId, actor.id, actor.status)),
    ...next.flows
      .filter((flow) => flow.status !== flowStatusBefore.get(flow.id))
      .map((flow) => repository.setFlowStatus(themeId, flow.id, flow.status)),
  ])

  return { status: 200, body: ok(next) }
}
