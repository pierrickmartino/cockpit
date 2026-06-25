import { describe, expect, it } from 'vitest'
import type { StructureRepository } from '@/repositories/structure-repository'

/** A fresh, empty repository bound to a freshly-seeded, valid theme id. */
export interface StructureContractContext {
  repository: StructureRepository
  themeId: string
}

const ABSENT_THEME = '00000000-0000-0000-0000-000000000000'

/**
 * The behavioural contract every StructureRepository must satisfy. The fake and
 * the Postgres implementation run this exact suite. `createContext` returns a
 * fresh repository plus a valid theme id to attach structure to (the Postgres
 * half needs a real theme row so foreign keys hold).
 */
export function runStructureRepositoryContract(
  name: string,
  createContext: () => Promise<StructureContractContext>,
): void {
  describe(`StructureRepository contract: ${name}`, () => {
    it('adds an actor and lists it within its theme', async () => {
      const { repository, themeId } = await createContext()

      const actor = await repository.addActor({
        themeId,
        name: 'TSMC',
        kind: 'point',
        actorKey: 'TSM',
        tier: 'foundry',
        location: 'Hsinchu, TW',
      })

      const actors = await repository.listActors(themeId)
      expect(actors).toHaveLength(1)
      expect(actors[0]).toEqual(actor)
      expect(actor.id).toBeTruthy()
      expect(actor.themeId).toBe(themeId)
      expect(actor.tier).toBe('foundry')
      expect(actor.createdAt).toBeInstanceOf(Date)
    })

    it('defaults optional tier and location to null', async () => {
      const { repository, themeId } = await createContext()

      const actor = await repository.addActor({
        themeId,
        name: 'Taiwan',
        kind: 'place',
        actorKey: 'TW',
      })

      expect(actor.tier).toBeNull()
      expect(actor.location).toBeNull()
    })

    it('adds a flow carrying substitutability between two actors', async () => {
      const { repository, themeId } = await createContext()
      const from = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })
      const to = await repository.addActor({ themeId, name: 'ASML', kind: 'point', actorKey: 'ASML' })

      const flow = await repository.addFlow({
        themeId,
        fromActorId: from.id,
        toActorId: to.id,
        substitutability: 0.1,
      })

      const flows = await repository.listFlows(themeId)
      expect(flows).toHaveLength(1)
      expect(flows[0]).toEqual(flow)
      expect(flow.substitutability).toBe(0.1)
      expect(flow.fromActorId).toBe(from.id)
      expect(flow.toActorId).toBe(to.id)
    })

    it('scopes listed actors and flows to their theme', async () => {
      const { repository, themeId } = await createContext()
      const from = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })
      const to = await repository.addActor({ themeId, name: 'ASML', kind: 'point', actorKey: 'ASML' })
      await repository.addFlow({ themeId, fromActorId: from.id, toActorId: to.id, substitutability: 0.2 })

      expect(await repository.listActors(ABSENT_THEME)).toEqual([])
      expect(await repository.listFlows(ABSENT_THEME)).toEqual([])
    })

    it('creates actors and flows as proposed (accept-gate entry status)', async () => {
      const { repository, themeId } = await createContext()
      const from = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })
      const to = await repository.addActor({ themeId, name: 'ASML', kind: 'point', actorKey: 'ASML' })
      const flow = await repository.addFlow({
        themeId,
        fromActorId: from.id,
        toActorId: to.id,
        substitutability: 0.2,
      })

      expect(from.status).toBe('proposed')
      expect(flow.status).toBe('proposed')
    })

    it('moves an actor to a new review status and returns the updated actor', async () => {
      const { repository, themeId } = await createContext()
      const actor = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })

      const updated = await repository.setActorStatus(themeId, actor.id, 'accepted')

      expect(updated?.status).toBe('accepted')
      expect(updated?.id).toBe(actor.id)
      const [reloaded] = await repository.listActors(themeId)
      expect(reloaded.status).toBe('accepted')
    })

    it('moves a flow to a new review status and returns the updated flow', async () => {
      const { repository, themeId } = await createContext()
      const from = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })
      const to = await repository.addActor({ themeId, name: 'ASML', kind: 'point', actorKey: 'ASML' })
      const flow = await repository.addFlow({
        themeId,
        fromActorId: from.id,
        toActorId: to.id,
        substitutability: 0.2,
      })

      const updated = await repository.setFlowStatus(themeId, flow.id, 'rejected')

      expect(updated?.status).toBe('rejected')
      const [reloaded] = await repository.listFlows(themeId)
      expect(reloaded.status).toBe('rejected')
    })

    it('returns null when setting status on an element outside the theme', async () => {
      const { repository, themeId } = await createContext()
      const actor = await repository.addActor({ themeId, name: 'TSMC', kind: 'point', actorKey: 'TSM' })

      expect(await repository.setActorStatus(ABSENT_THEME, actor.id, 'accepted')).toBeNull()
      expect(await repository.setFlowStatus(themeId, ABSENT_THEME, 'accepted')).toBeNull()
    })
  })
}
