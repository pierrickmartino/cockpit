import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StructurePreview } from '@/app/admin/StructurePreview'
import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'

const THEME_ID = '00000000-0000-0000-0000-000000000000'

function actor(id: string, name: string): Actor {
  return {
    id,
    themeId: THEME_ID,
    name,
    kind: 'point',
    actorKey: id,
    tier: null,
    location: null,
    status: 'accepted',
    createdAt: new Date(),
  }
}

function flow(from: string, to: string, substitutability: number): Flow {
  return {
    id: `${from}->${to}`,
    themeId: THEME_ID,
    fromActorId: from,
    toActorId: to,
    substitutability,
    status: 'accepted',
    createdAt: new Date(),
  }
}

describe('StructurePreview power display', () => {
  // Buyer depends on TSMC (sole source); TSMC depends on ASML (half-substitutable);
  // Island has no dependents. Expected raw power: TSMC 1, ASML 0.5, Buyer/Island 0.
  const actors = [
    actor('asml', 'ASML'),
    actor('tsmc', 'TSMC'),
    actor('buyer', 'Buyer'),
    actor('island', 'Island'),
  ]
  const flows = [flow('buyer', 'tsmc', 0), flow('tsmc', 'asml', 0.5)]

  it('renders one power row per actor, ranked by power descending', () => {
    render(<StructurePreview actors={actors} flows={flows} />)

    const rows = screen.getAllByTestId('power-item')
    const text = rows.map((row) => row.textContent ?? '')

    expect(rows).toHaveLength(actors.length)
    expect(text[0]).toContain('TSMC')
    expect(text[1]).toContain('ASML')
    // The two zero-power actors come last (after the ranked ones).
    expect(text.slice(2).join(' ')).toContain('Buyer')
    expect(text.slice(2).join(' ')).toContain('Island')
  })

  it('shows the top actor at 100% and a no-dependency actor at 0%', () => {
    render(<StructurePreview actors={actors} flows={flows} />)

    const rows = screen.getAllByTestId('power-item')
    const byActor = (name: string) =>
      rows.find((row) => row.textContent?.includes(name))?.textContent ?? ''

    expect(byActor('TSMC')).toContain('100%')
    expect(byActor('ASML')).toContain('50%')
    expect(byActor('Island')).toContain('0%')
  })
})
