'use client'

import { useState, type FormEvent } from 'react'
import type { ApiResponse } from '@/api/response'
import type {
  ConversationMessage,
  GenerationReport,
  GenerationTurnResult,
} from '@/domain/generation'

interface ConversationPanelProps {
  themeId: string
  /** Builds the admin-authenticated request headers (shared with the workbench). */
  authHeaders: () => Record<string, string>
  /** Called after a successful turn so the workbench reloads the new proposals. */
  onProposalsChanged: () => void | Promise<void>
}

/**
 * The conversation panel: drives generation by sending the **client-held**
 * transcript to `/generate` each turn (ADR-0021 — the server is stateless, no
 * conversation persistence). Deliberately plain: a message list, an input, and
 * the per-turn report ("3 actors, 1 of 2 flows added; dropped: …"). Refreshing
 * the workbench clears this transcript, but the proposals it produced persist
 * through the accept-gate. No streaming, no markdown.
 */
export function ConversationPanel({ themeId, authHeaders, onProposalsChanged }: ConversationPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [report, setReport] = useState<GenerationReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = input.trim()
    if (!text || pending) {
      return
    }

    const transcript: ConversationMessage[] = [...messages, { role: 'admin', text }]
    setMessages(transcript)
    setInput('')
    setError(null)
    setPending(true)

    try {
      const response = await fetch(`/api/themes/${themeId}/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages: transcript }),
      })
      const body: ApiResponse<GenerationTurnResult> = await response.json()

      if (body.success && body.data) {
        setMessages([...transcript, { role: 'model', text: body.data.reply }])
        setReport(body.data.report)
        await onProposalsChanged()
      } else {
        setError(body.error ?? 'Generation failed, please retry')
      }
    } catch {
      setError('Failed to reach the server')
    } finally {
      setPending(false)
    }
  }

  return (
    <section data-testid="conversation-panel">
      <h3>Conversation</h3>

      <ul data-testid="conversation-messages">
        {messages.map((message, index) => (
          <li key={index} data-testid="conversation-message" data-role={message.role}>
            <strong>{message.role === 'admin' ? 'You' : 'Model'}:</strong> {message.text}
          </li>
        ))}
      </ul>

      {report && <TurnReport report={report} />}

      {error && (
        <p role="alert" data-testid="conversation-error" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} data-testid="conversation-form">
        <input
          data-testid="conversation-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the model to propose actors and flows…"
        />
        <button type="submit" data-testid="conversation-send" disabled={pending}>
          {pending ? 'Generating…' : 'Send'}
        </button>
      </form>
    </section>
  )
}

/**
 * The best-effort per-turn report (ADR-0021): what landed and what was dropped,
 * surfaced rather than swallowed so the Admin sees the model's actual effect.
 */
function TurnReport({ report }: { report: GenerationReport }) {
  const dropped = [
    ...report.droppedActors.map((actor) => `${actor.name}: ${actor.reason}`),
    ...report.droppedFlows.map((flow) => `${flow.fromRef} → ${flow.toRef}: ${flow.reason}`),
  ]

  return (
    <div data-testid="turn-report">
      <p data-testid="report-added">
        Added {report.addedActors.length} actor(s)
        {report.addedActors.length > 0 ? ` (${report.addedActors.join(', ')})` : ''}, {report.addedFlows}{' '}
        flow(s)
        {report.reusedActors.length > 0 ? `; reused ${report.reusedActors.join(', ')}` : ''}
      </p>
      {dropped.length > 0 && (
        <ul data-testid="report-dropped">
          {dropped.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
