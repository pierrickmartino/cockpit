'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import type { ApiResponse } from '@/api/response'
import type { Theme } from '@/domain/theme'

/**
 * Minimal Admin workbench shell: creates an empty Theme and links to its viewer.
 * Later slices add the conversation panel, review surface, and live preview.
 */
export default function AdminPage() {
  const [title, setTitle] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [created, setCreated] = useState<Theme | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCreated(null)

    try {
      // Authoring is admin-only: present the admin token as a Bearer credential.
      // Kept in component state (never bundled) so the secret stays server-side.
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (adminToken) {
        headers.authorization = `Bearer ${adminToken}`
      }

      const response = await fetch('/api/themes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      })
      const body: ApiResponse<Theme> = await response.json()

      if (body.success && body.data) {
        setCreated(body.data)
        setTitle('')
      } else {
        setError(body.error ?? 'Failed to create theme')
      }
    } catch {
      setError('Failed to reach the server')
    }
  }

  return (
    <main>
      <h1>Admin workbench</h1>

      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="admin-token">Admin token</label>{' '}
          <input
            id="admin-token"
            type="password"
            data-testid="admin-token-input"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="Admin token"
          />
        </p>
        <p>
          <label htmlFor="theme-title">Theme title</label>{' '}
          <input
            id="theme-title"
            data-testid="theme-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Semiconductors"
          />{' '}
          <button type="submit" data-testid="create-theme-button">
            Create theme
          </button>
        </p>
      </form>

      {error && (
        <p role="alert" data-testid="create-theme-error" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      {created && (
        <section data-testid="created-theme">
          <p>
            Created theme <strong>{created.title}</strong> ({created.state}).
          </p>
          <Link href={`/view/${created.id}`} data-testid="view-theme-link">
            View theme
          </Link>
        </section>
      )}
    </main>
  )
}
