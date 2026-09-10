import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MemberSeasonPanel } from './MemberSeasonPanel'
import { demoData } from '../data/demoData'
import { getMemberSeasonSummary } from '../data/rankingMemberSeason'
import type { DemoDataSet } from '../domain/types'

const standardFilters = {
  gameId: 'game-mtg',
  formatId: 'format-mtg-standard',
  seasonId: 'ranking-season-2026',
}

function summaryOf(memberId: string, data: DemoDataSet = demoData) {
  return getMemberSeasonSummary(data, memberId, standardFilters)!
}

describe('MemberSeasonPanel', () => {
  it('shows the position, the points and the places gained', () => {
    render(<MemberSeasonPanel summary={summaryOf('member-carla')} />)

    expect(
      screen.getByRole('heading', { name: 'Posición 1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('47 puntos comunidad · Temporada 2026'),
    ).toBeInTheDocument()
    expect(screen.getByText('+2 puestos')).toBeInTheDocument()
    expect(screen.getByText('Lideras la clasificación')).toBeInTheDocument()
    expect(screen.getByText('6 de 6 eventos puntuables')).toBeInTheDocument()
  })

  it('shows both gaps and the next placement worth playing for', () => {
    render(<MemberSeasonPanel summary={summaryOf('member-sergio')} />)

    expect(screen.getByText('−1 puesto')).toBeInTheDocument()
    expect(screen.getByText(/A 1 punto de la posición 1/)).toBeInTheDocument()
    expect(screen.getByText(/4 puntos sobre la posición 3/)).toBeInTheDocument()
    expect(
      screen.getByText('Con un top 10 subirías a la posición 1'),
    ).toBeInTheDocument()
  })

  it('invites an unranked member instead of showing an empty board', () => {
    render(<MemberSeasonPanel summary={summaryOf('member-lucia')} />)

    expect(
      screen.getByRole('heading', { name: 'Aún no estás clasificado' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Con un top 10 entrarías en la posición 15'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Mejor resultado/)).not.toBeInTheDocument()
  })

  it('does not repeat the only result of the season as a highlight', () => {
    const data = structuredClone(demoData) as DemoDataSet
    data.eventStandings = data.eventStandings.filter(
      ({ id }) => id === 'standing-win-a-box-standard-2026-08-02',
    )

    const summary = summaryOf('member-carla', data)

    expect(summary.results).toHaveLength(1)
    render(<MemberSeasonPanel summary={summary} />)

    expect(screen.queryByText(/Mejor resultado/)).toBeNull()
    expect(
      within(
        screen.getByRole('list', { name: 'Tus resultados de la temporada' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1)
  })

  it('hides a streak that is not worth keeping alive', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const latest = data.eventStandings.find(
      ({ id }) => id === 'standing-win-a-box-standard-2026-08-02',
    )!
    latest.entries = latest.entries.filter(
      (entry) => entry.memberId !== 'member-carla',
    )

    expect(summaryOf('member-carla').currentStreak).toBe(6)
    render(<MemberSeasonPanel summary={summaryOf('member-carla', data)} />)

    expect(screen.queryByText(/eventos puntuables seguidos/)).toBeNull()
  })

  it('keeps a long season compact until the member asks for more', () => {
    render(<MemberSeasonPanel summary={summaryOf('member-carla')} />)

    const results = () =>
      within(
        screen.getByRole('list', { name: 'Tus resultados de la temporada' }),
      ).getAllByRole('listitem')

    expect(results()).toHaveLength(5)

    const toggle = screen.getByRole('button', {
      name: 'Ver los 6 resultados',
    })

    fireEvent.click(toggle)

    expect(results()).toHaveLength(6)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('stays minimal in the compact density', () => {
    render(
      <MemberSeasonPanel
        density="compact"
        summary={summaryOf('member-carla')}
        footer={<a href="#ranking">Ver clasificación</a>}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Posición 1' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Mejor resultado/)).toBeNull()
    expect(
      screen.queryByRole('list', { name: 'Tus resultados de la temporada' }),
    ).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Ver clasificación' }),
    ).toBeInTheDocument()
  })
})
