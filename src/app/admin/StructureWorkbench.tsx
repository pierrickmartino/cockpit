'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ApiResponse } from '@/api/response'
import type { ReviewAction } from '@/domain/accept-gate'
import type { Actor, ActorKind } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { PublishedSnapshot } from '@/domain/published-snapshot'
import type { WorkingStructure } from '@/domain/structure'
import { ConversationPanel } from '@/app/admin/ConversationPanel'
import { ReviewQueue } from '@/app/admin/ReviewQueue'
import { StructurePreview } from '@/app/admin/StructurePreview'

interface StructureWorkbenchProps {
  themeId: string
  adminToken: string
}

const ACTOR_KINDS: ActorKind[] = ['place', 'point']

/**
 * Authoring surface for a theme's working structure: add actors, add dependency
 * flows carrying substitutability, and preview the current actors and flows.
 * Reads and writes are admin-only, so every request presents the admin token.
 */
export function StructureWorkbench({ themeId, adminToken }: StructureWorkbenchProps) {
  const [actors, setActors] = useState<Actor[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState<PublishedSnapshot | null>(null)

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (adminToken) {
      headers.authorization = `Bearer ${adminToken}`
    }
    return headers
  }, [adminToken])

  const loadStructure = useCallback(async () => {
    try {
      const response = await fetch(`/api/themes/${themeId}/structure`, { headers: authHeaders() })
      const body: ApiResponse<WorkingStructure> = await response.json()
      if (body.success && body.data) {
        setActors(body.data.actors)
        setFlows(body.data.flows)
      } else {
        setError(body.error ?? 'Failed to load structure')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }, [themeId, authHeaders])

  useEffect(() => {
    void loadStructure()
  }, [loadStructure])

  async function submitActor(input: NewActorForm) {
    setError(null)
    try {
      const response = await fetch(`/api/themes/${themeId}/actors`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
      const body: ApiResponse<Actor> = await response.json()
      if (body.success) {
        await loadStructure()
      } else {
        setError(body.error ?? 'Failed to add actor')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }

  async function submitFlow(input: NewFlowForm) {
    setError(null)
    try {
      const response = await fetch(`/api/themes/${themeId}/flows`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
      const body: ApiResponse<Flow> = await response.json()
      if (body.success) {
        await loadStructure()
      } else {
        setError(body.error ?? 'Failed to add flow')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }

  async function submitReview(action: ReviewAction) {
    setError(null)
    try {
      const response = await fetch(`/api/themes/${themeId}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ actions: [action] }),
      })
      const body: ApiResponse<WorkingStructure> = await response.json()
      if (body.success) {
        await loadStructure()
      } else {
        setError(body.error ?? 'Failed to review proposal')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }

  async function submitPublish() {
    setError(null)
    try {
      const response = await fetch(`/api/themes/${themeId}/publish`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const body: ApiResponse<PublishedSnapshot> = await response.json()
      if (body.success && body.data) {
        setPublished(body.data)
      } else {
        setError(body.error ?? 'Failed to publish')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }

  return (
    <section data-testid="structure-workbench">
      <h2>Working structure</h2>

      <ConversationPanel
        themeId={themeId}
        authHeaders={authHeaders}
        onProposalsChanged={loadStructure}
      />

      <ActorForm onSubmit={submitActor} />
      <FlowForm actors={actors} onSubmit={submitFlow} />

      {error && (
        <p role="alert" data-testid="structure-error" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      <ReviewQueue actors={actors} flows={flows} onReview={submitReview} />
      <StructurePreview actors={actors} flows={flows} />

      <div data-testid="publish-panel">
        <h3>Publish</h3>
        <p>Freeze the accepted structure as the version viewers see.</p>
        <button type="button" data-testid="publish-button" onClick={() => void submitPublish()}>
          Publish
        </button>
        {published && (
          <p data-testid="publish-status">Published version {published.version}.</p>
        )}
      </div>
    </section>
  )
}

interface NewActorForm {
  name: string
  kind: ActorKind
  actorKey: string
  tier: string
  location: string
}

function ActorForm({ onSubmit }: { onSubmit: (input: NewActorForm) => void | Promise<void> }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ActorKind>('point')
  const [actorKey, setActorKey] = useState('')
  const [tier, setTier] = useState('')
  const [location, setLocation] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({ name, kind, actorKey, tier, location })
    setName('')
    setActorKey('')
    setTier('')
    setLocation('')
  }

  return (
    <form onSubmit={handleSubmit} data-testid="actor-form">
      <h3>Add actor</h3>
      <input
        data-testid="actor-name-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name, e.g. TSMC"
      />
      <select
        data-testid="actor-kind-input"
        value={kind}
        onChange={(event) => setKind(event.target.value as ActorKind)}
      >
        {ACTOR_KINDS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        data-testid="actor-key-input"
        value={actorKey}
        onChange={(event) => setActorKey(event.target.value)}
        placeholder="Actor key, e.g. TSM"
      />
      <input
        data-testid="actor-tier-input"
        value={tier}
        onChange={(event) => setTier(event.target.value)}
        placeholder="Tier (optional)"
      />
      <input
        data-testid="actor-location-input"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder="Location (optional)"
      />
      <button type="submit" data-testid="add-actor-button">
        Add actor
      </button>
    </form>
  )
}

interface NewFlowForm {
  fromActorId: string
  toActorId: string
  substitutability: number
}

function FlowForm({
  actors,
  onSubmit,
}: {
  actors: Actor[]
  onSubmit: (input: NewFlowForm) => void | Promise<void>
}) {
  const [fromActorId, setFromActorId] = useState('')
  const [toActorId, setToActorId] = useState('')
  const [substitutability, setSubstitutability] = useState('0.5')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      fromActorId,
      toActorId,
      substitutability: Number(substitutability),
    })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="flow-form">
      <h3>Add flow</h3>
      <select
        data-testid="flow-from-input"
        value={fromActorId}
        onChange={(event) => setFromActorId(event.target.value)}
      >
        <option value="">From actor…</option>
        {actors.map((actor) => (
          <option key={actor.id} value={actor.id}>
            {actor.name}
          </option>
        ))}
      </select>
      <select
        data-testid="flow-to-input"
        value={toActorId}
        onChange={(event) => setToActorId(event.target.value)}
      >
        <option value="">To actor…</option>
        {actors.map((actor) => (
          <option key={actor.id} value={actor.id}>
            {actor.name}
          </option>
        ))}
      </select>
      <input
        data-testid="flow-substitutability-input"
        type="number"
        min={0}
        max={1}
        step={0.1}
        value={substitutability}
        onChange={(event) => setSubstitutability(event.target.value)}
        placeholder="Substitutability 0–1"
      />
      <button type="submit" data-testid="add-flow-button">
        Add flow
      </button>
    </form>
  )
}
