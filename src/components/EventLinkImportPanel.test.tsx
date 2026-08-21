import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DemoDataUpdater } from '../data/demoRepository'
import { demoData } from '../data/demoData'
import { EventLinkImportPanel } from './EventLinkImportPanel'

const eventLinkHtml = `
  <!-- saved from url=(0077)https://eventlink.wizards.com/stores/18452/events/11620006/rounds/5/standings -->
  <h1 class="event-page-header__title">Pauper de prueba</h1>
  <div class="round-timer__complete">Se completó</div>
  <table>
    <thead><tr><th>Puesto</th><th>Nombre</th><th>Puntos</th><th>V/D/E</th><th>%VPO</th><th>%JG</th><th>%JGO</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Sergio Gil</td><td>9</td><td>3/0/0</td><td>60.0%</td><td>75.0%</td><td>55.0%</td></tr>
      <tr><td>2</td><td>Invitada Externa</td><td>6</td><td>2/1/0</td><td>55.0%</td><td>66.7%</td><td>50.0%</td></tr>
    </tbody>
  </table>
`

describe('EventLinkImportPanel', () => {
  it('previews a saved page, links known members and imports the standing', async () => {
    const event = demoData.events.find(
      ({ id }) => id === 'event-presentation-hobbit',
    )!
    const manager = demoData.members.find(({ id }) => id === 'member-lucia')!
    const onDataChange = vi.fn<(updater: DemoDataUpdater) => void>()
    const onImported = vi.fn()
    const { container } = render(
      <EventLinkImportPanel
        data={demoData}
        event={event}
        manager={manager}
        onClose={vi.fn()}
        onDataChange={onDataChange}
        onImported={onImported}
      />,
    )
    const file = new File([eventLinkHtml], 'eventlink.html', {
      type: 'text/html',
    })
    Object.defineProperty(file, 'text', {
      value: async () => eventLinkHtml,
    })

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })

    expect(await screen.findByText('Pauper de prueba')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Miembro Garroveta para Sergio Gil'),
    ).toHaveValue('member-sergio')
    expect(
      screen.getByLabelText('Miembro Garroveta para Invitada Externa'),
    ).toHaveValue('')

    fireEvent.click(
      screen.getByRole('button', { name: 'Importar clasificación' }),
    )

    await waitFor(() => expect(onDataChange).toHaveBeenCalledOnce())
    const updater = onDataChange.mock.calls[0][0]
    const updated = typeof updater === 'function' ? updater(demoData) : updater

    expect(
      updated.eventStandings.find(
        ({ eventId }) => eventId === 'event-presentation-hobbit',
      )?.entries,
    ).toEqual([
      expect.objectContaining({
        displayName: 'Sergio Gil',
        memberId: 'member-sergio',
      }),
      expect.objectContaining({
        displayName: 'Invitada Externa',
        memberId: undefined,
      }),
    ])
    expect(onImported).toHaveBeenCalledWith(
      'La clasificación EventLink se ha importado.',
    )
  })
})
