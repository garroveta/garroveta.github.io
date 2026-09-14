import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { listCommunityMembers } from '../api/managerMembers'
import { demoData } from '../data/demoData'
import type { DemoDataSet } from '../domain/types'
import { EventLinkImportPanel } from './EventLinkImportPanel'

vi.mock('../api/managerMembers', () => ({
  listCommunityMembers: vi.fn(),
}))

const eventLinkHtml = `
  <!-- saved from url=(0077)https://eventlink.wizards.com/stores/18452/events/11620006/rounds/5/standings -->
  <h1 class="event-page-header__title">Standard de prueba</h1>
  <div class="round-timer__complete">Se completó</div>
  <table>
    <thead><tr><th>Puesto</th><th>Nombre</th><th>Puntos</th><th>V/D/E</th><th>%VPO</th><th>%JG</th><th>%JGO</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Sergio Gil</td><td>9</td><td>3/0/0</td><td>60.0%</td><td>75.0%</td><td>55.0%</td></tr>
      <tr><td>2</td><td>Invitada Externa</td><td>6</td><td>2/1/0</td><td>55.0%</td><td>66.7%</td><td>50.0%</td></tr>
    </tbody>
  </table>
`

function mockMembers() {
  vi.mocked(listCommunityMembers).mockResolvedValue({
    currentMemberId: 'member-lucia',
    members: demoData.members.map((member) => ({
      displayName: member.displayName,
      email: `${member.id}@example.com`,
      favoriteGameIds: member.favoriteGameIds,
      id: member.id,
      joinedAt: member.joinedAt,
      role: member.role,
      status: member.status,
      tagIds: member.tagIds,
    })),
  })
}

/** An event that already carries results, as the season goes on. */
function eventWithStanding() {
  const data = structuredClone(demoData) as DemoDataSet
  const standing = data.eventStandings[0]!

  return {
    data,
    event: data.events.find(({ id }) => id === standing.eventId)!,
    standing,
  }
}

describe('EventLinkImportPanel', () => {
  it('previews a saved page, links known members and imports the standing', async () => {
    const event = demoData.events.find(
      ({ id }) => id === 'event-presentation-hobbit',
    )!
    const onImported = vi.fn()
    const onSaveStanding = vi.fn().mockResolvedValue({
      id: 'standing-remote-1',
      eventId: event.id,
      entries: [],
    })
    vi.mocked(listCommunityMembers).mockResolvedValue({
      currentMemberId: 'member-lucia',
      members: demoData.members.map((member) => ({
        displayName: member.displayName,
        email: `${member.id}@example.com`,
        favoriteGameIds: member.favoriteGameIds,
        id: member.id,
        joinedAt: member.joinedAt,
        role: member.role,
        status: member.status,
        tagIds: member.tagIds,
      })),
    })
    const { container } = render(
      <EventLinkImportPanel
        data={demoData}
        event={event}
        onClose={vi.fn()}
        onImported={onImported}
        onSaveStanding={onSaveStanding}
      />,
    )
    expect(
      await screen.findByText('Seleccionar archivo EventLink'),
    ).toBeInTheDocument()

    const file = new File([eventLinkHtml], 'eventlink.html', {
      type: 'text/html',
    })
    Object.defineProperty(file, 'text', {
      value: async () => eventLinkHtml,
    })

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })

    expect(await screen.findByText('Standard de prueba')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Miembro Garroveta para Sergio Gil'),
    ).toHaveValue('member-sergio')
    expect(
      screen.getByLabelText('Miembro Garroveta para Invitada Externa'),
    ).toHaveValue('')
    expect(
      screen.queryByText(/inscripciones confirmadas/),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Importar clasificación' }),
    )

    await waitFor(() => expect(onSaveStanding).toHaveBeenCalledOnce())
    expect(onSaveStanding).toHaveBeenCalledWith(
      'event-presentation-hobbit',
      expect.objectContaining({
        countsForCommunityRanking: true,
        entries: [
          expect.objectContaining({
            displayName: 'Sergio Gil',
            memberId: 'member-sergio',
          }),
          expect.objectContaining({
            displayName: 'Invitada Externa',
            memberId: undefined,
          }),
        ],
        source: expect.objectContaining({
          storeId: '18452',
          externalEventId: '11620006',
          roundNumber: 5,
        }),
      }),
    )
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith(
        'La clasificación EventLink se ha importado.',
        'standing-remote-1',
      ),
    )
  })

  it('opens on the saved standing so a wrong link can be fixed without the file', async () => {
    mockMembers()
    const { data, event, standing } = eventWithStanding()
    const onImported = vi.fn()
    const onSaveStanding = vi.fn().mockResolvedValue(standing)

    render(
      <EventLinkImportPanel
        data={data}
        event={event}
        onClose={vi.fn()}
        onImported={onImported}
        onSaveStanding={onSaveStanding}
      />,
    )

    // EventLink deletes its pages after a few days, so the saved standing is
    // the only copy left: it seeds the panel with the links already in place.
    const misfiled = await screen.findByLabelText(
      `Miembro Garroveta para ${standing.entries[0]!.displayName}`,
    )

    expect(misfiled).toHaveValue(standing.entries[0]!.memberId)

    fireEvent.change(misfiled, { target: { value: 'member-biel' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar los vínculos' }),
    )

    await waitFor(() => expect(onSaveStanding).toHaveBeenCalledOnce())

    const [, input] = onSaveStanding.mock.calls[0]!

    // Only the link moved: every other row keeps the member it had.
    expect(input.entries[0]).toMatchObject({
      displayName: standing.entries[0]!.displayName,
      memberId: 'member-biel',
      rank: standing.entries[0]!.rank,
    })
    expect(input.entries[1]).toMatchObject({
      memberId: standing.entries[1]!.memberId,
    })
    expect(input.entries).toHaveLength(standing.entries.length)
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith(
        'Los vínculos de la clasificación se han actualizado.',
        standing.id,
      ),
    )
  })

  it('lets a wrong link go back to nobody', async () => {
    mockMembers()
    const { data, event, standing } = eventWithStanding()
    const onSaveStanding = vi.fn().mockResolvedValue(standing)

    render(
      <EventLinkImportPanel
        data={data}
        event={event}
        onClose={vi.fn()}
        onImported={vi.fn()}
        onSaveStanding={onSaveStanding}
      />,
    )

    fireEvent.change(
      await screen.findByLabelText(
        `Miembro Garroveta para ${standing.entries[0]!.displayName}`,
      ),
      { target: { value: '' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar los vínculos' }),
    )

    await waitFor(() => expect(onSaveStanding).toHaveBeenCalledOnce())

    // Unlinked on purpose: it goes back to the manager's orphan list and waits
    // for the right member instead of scoring for the wrong one.
    expect(onSaveStanding.mock.calls[0]![1].entries[0].memberId).toBeUndefined()
  })

  it('refuses to touch a standing frozen by a closed season', async () => {
    mockMembers()
    const { data, event, standing } = eventWithStanding()
    const closedSeason = data.rankingSeasons.find(
      ({ status }) => status === 'closed',
    )!
    standing.rankingSeasonId = closedSeason.id

    render(
      <EventLinkImportPanel
        data={data}
        event={event}
        onClose={vi.fn()}
        onImported={vi.fn()}
        onSaveStanding={vi.fn()}
      />,
    )

    expect(
      await screen.findByText(
        new RegExp(`La temporada «${closedSeason.name}» está cerrada`),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Guardar los vínculos' }),
    ).toBeDisabled()
  })
})
