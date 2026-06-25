import { notFound } from 'next/navigation'
import { getSnapshotRepository, getThemeRepository } from '@/repositories/factory'
import { getPublishedSnapshot } from '@/services/snapshot-service'
import { getTheme } from '@/services/theme-service'
import { PublishedSnapshotView } from './PublishedSnapshotView'

/**
 * Viewer destination for a theme: renders the latest **published** snapshot,
 * never the working state (ADR-0012). The frozen snapshot is the only thing a
 * Viewer ever sees, so unaccepted/unpublished authoring edits cannot leak here.
 * Until the theme is published it shows an empty-state message.
 */
export default async function ViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const themeResult = await getTheme(getThemeRepository(), id)

  if (!themeResult.body.success || !themeResult.body.data) {
    notFound()
  }

  const theme = themeResult.body.data
  const snapshotResult = await getPublishedSnapshot(getSnapshotRepository(), id)
  const snapshot = snapshotResult.body.success ? snapshotResult.body.data : null

  return (
    <main>
      <h1 data-testid="theme-title">{theme.title}</h1>
      {snapshot ? (
        <>
          <p data-testid="published-version">Published version {snapshot.version}</p>
          <PublishedSnapshotView content={snapshot.content} />
        </>
      ) : (
        <p data-testid="not-published">This theme has not been published yet.</p>
      )}
    </main>
  )
}
