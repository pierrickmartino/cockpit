import { notFound } from 'next/navigation'
import { getThemeRepository } from '@/repositories/factory'
import { getTheme } from '@/services/theme-service'

/**
 * Minimal Viewer shell: loads a published-or-working Theme by id and displays
 * it. Later slices render the MapLibre map, panels, and live overlay.
 */
export default async function ViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getTheme(getThemeRepository(), id)

  if (!result.body.success || !result.body.data) {
    notFound()
  }

  const theme = result.body.data

  return (
    <main>
      <h1 data-testid="theme-title">{theme.title}</h1>
      <p data-testid="theme-state">State: {theme.state}</p>
      <p>This theme is empty. The map and panels arrive in later slices.</p>
    </main>
  )
}
