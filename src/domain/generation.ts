/**
 * The generation core's domain contract (issue #26, ADR-0021). The generation
 * model converses with the Admin and returns **structured domain proposals** —
 * actors and flows with citations already parsed — for the service to ground,
 * persist, and report on. All model wire shape (tool-call JSON, citation blocks,
 * web-search metadata) is translated inside the adapter and never crosses this
 * interface; the model never touches the database.
 */

import type { Actor, ActorKind } from '@/domain/actor'
import type { Citation } from '@/domain/citation'
import type { Flow } from '@/domain/flow'
import type { WorkingStructure } from '@/domain/structure'

/**
 * One turn of the client-held, stateless conversation transcript (ADR-0021).
 * `admin` is the human author; `model` is the generation model's prior reply.
 */
export interface ConversationMessage {
  role: 'admin' | 'model'
  text: string
}

/**
 * Everything a turn feeds the model: the conversation so far and the theme's
 * current working structure, so proposals reuse existing actors by `actorKey`
 * rather than duplicating them.
 */
export interface GenerationRequest {
  themeId: string
  messages: ConversationMessage[]
  structure: WorkingStructure
}

/**
 * A proposed actor before persistence. `ref` is the model-supplied temporary
 * identifier a flow uses to point at this actor within the same turn (before any
 * UUID exists). `citations` already carry their per-claim `relevance`/`tier`/
 * `location` tags.
 */
export interface ProposedActor {
  /** Model-supplied temp-id used to resolve flow endpoints within this turn. */
  ref: string
  name: string
  kind: ActorKind
  actorKey: string
  tier?: string | null
  location?: string | null
  citations: Citation[]
}

/**
 * A proposed flow before persistence. Endpoints are referenced by the
 * model-supplied name/temp-id (`fromRef`/`toRef`), resolved to persisted UUIDs
 * by the service. Direction is dependent → depended-upon (CONTEXT.md).
 */
export interface ProposedFlow {
  fromRef: string
  toRef: string
  substitutability: number
  citations: Citation[]
}

/** The structured result a generation turn produces; no persistence performed. */
export interface GenerationResult {
  /** The model's conversational reply for the conversation panel. */
  reply: string
  proposedActors: ProposedActor[]
  proposedFlows: ProposedFlow[]
}

/** The adapter behind which all model wire shape is hidden. */
export interface GenerationModel {
  generate(request: GenerationRequest): Promise<GenerationResult>
}

/** An actor that did not survive the turn, with why it was dropped. */
export interface DroppedActor {
  ref: string
  name: string
  reason: string
}

/** A flow that did not survive the turn, with why it was dropped. */
export interface DroppedFlow {
  fromRef: string
  toRef: string
  reason: string
}

/**
 * The best-effort per-turn report: what landed and what was dropped, so the
 * conversation panel can surface it rather than swallow it (ADR-0021). Counts of
 * what was added, the existing actors reused by `actorKey` instead of
 * duplicated, and the dropped elements with reasons.
 */
export interface GenerationReport {
  /** Names of actors newly persisted this turn. */
  addedActors: string[]
  /** Names of existing actors reused by `actorKey` rather than duplicated. */
  reusedActors: string[]
  /** Count of flows newly persisted this turn. */
  addedFlows: number
  /** Actors dropped by the grounding floor. */
  droppedActors: DroppedActor[]
  /** Flows dropped by the grounding floor or by an unresolvable endpoint. */
  droppedFlows: DroppedFlow[]
}

/** What a completed generation turn returns: reply, survivors, and the report. */
export interface GenerationTurnResult {
  reply: string
  proposals: {
    actors: Actor[]
    flows: Flow[]
  }
  report: GenerationReport
}
