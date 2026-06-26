import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationPanel } from '@/app/admin/ConversationPanel'
import type { GenerationReport } from '@/domain/generation'

const THEME_ID = '00000000-0000-0000-0000-000000000000'

const EMPTY_REPORT: GenerationReport = {
  addedActors: [],
  reusedActors: [],
  addedFlows: 0,
  droppedActors: [],
  droppedFlows: [],
}

function turnResponse(reply: string, report: Partial<GenerationReport> = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        reply,
        proposals: { actors: [], flows: [] },
        report: { ...EMPTY_REPORT, ...report },
      },
    }),
  } as Response
}

function renderPanel(onProposalsChanged = vi.fn()) {
  const authHeaders = () => ({ 'content-type': 'application/json', authorization: 'Bearer t' })
  render(
    <ConversationPanel
      themeId={THEME_ID}
      authHeaders={authHeaders}
      onProposalsChanged={onProposalsChanged}
    />,
  )
  return { onProposalsChanged }
}

function send(text: string) {
  fireEvent.change(screen.getByTestId('conversation-input'), { target: { value: text } })
  fireEvent.click(screen.getByTestId('conversation-send'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ConversationPanel', () => {
  it('sends the transcript to /generate and renders the model reply', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(turnResponse('Proposed TSMC and Taiwan.'))
    renderPanel()

    send('Build the AI compute graph.')

    expect(await screen.findByText('Proposed TSMC and Taiwan.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/themes/${THEME_ID}/generate`,
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages).toEqual([{ role: 'admin', text: 'Build the AI compute graph.' }])
  })

  it('renders the admin message immediately and the model reply as distinct turns', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(turnResponse('On it.'))
    renderPanel()

    send('Add TSMC.')

    await screen.findByText('On it.')
    const messages = screen.getAllByTestId('conversation-message')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toHaveTextContent('Add TSMC.')
    expect(messages[1]).toHaveTextContent('On it.')
  })

  it('surfaces the per-turn report, including dropped elements', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      turnResponse('Done.', {
        addedActors: ['TSMC', 'Taiwan'],
        addedFlows: 1,
        droppedFlows: [{ fromRef: 'Apple', toRef: 'Foxconn', reason: "endpoint 'Foxconn' not found" }],
      }),
    )
    renderPanel()

    send('Build it.')

    const report = await screen.findByTestId('turn-report')
    expect(report).toHaveTextContent('TSMC')
    expect(report).toHaveTextContent('Taiwan')
    expect(within(report).getByTestId('report-dropped')).toHaveTextContent("endpoint 'Foxconn' not found")
  })

  it('reloads the working structure after a successful turn so proposals appear', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(turnResponse('Proposed.'))
    const { onProposalsChanged } = renderPanel()

    send('Build it.')

    await waitFor(() => expect(onProposalsChanged).toHaveBeenCalledTimes(1))
  })

  it('keeps prior turns in the transcript it sends each turn', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(turnResponse('First reply.'))
      .mockResolvedValueOnce(turnResponse('Second reply.'))
    renderPanel()

    send('First message.')
    await screen.findByText('First reply.')
    send('Second message.')
    await screen.findByText('Second reply.')

    const body = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    expect(body.messages).toEqual([
      { role: 'admin', text: 'First message.' },
      { role: 'model', text: 'First reply.' },
      { role: 'admin', text: 'Second message.' },
    ])
  })

  it('does not send an empty message', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(turnResponse('hi'))
    renderPanel()

    fireEvent.change(screen.getByTestId('conversation-input'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('conversation-send'))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows an error when the turn fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Generation failed, please retry' }),
    } as Response)
    renderPanel()

    send('Build it.')

    expect(await screen.findByTestId('conversation-error')).toHaveTextContent(
      'Generation failed, please retry',
    )
  })
})
