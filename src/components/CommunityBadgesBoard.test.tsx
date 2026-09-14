import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CommunityBadgesBoard } from './CommunityBadgesBoard'
import { SeasonBadgesPanel } from './SeasonBadgesPanel'
import { demoData } from '../data/demoData'
import { getSeasonBadgeBoard } from '../data/rankingBadges'

const board = getSeasonBadgeBoard(demoData, {
  gameId: 'game-mtg',
  seasonId: 'ranking-season-2026',
})!

describe('CommunityBadgesBoard', () => {
  it('names every holder of a badge', () => {
    render(<CommunityBadgesBoard board={board} />)

    const ferocious = within(
      screen.getByRole('list', { name: 'Quién tiene Ferocious' }),
    ).getAllByRole('button')

    expect(ferocious.map((button) => button.textContent)).toEqual(
      board.badges
        .find(({ definition }) => definition.id === 'ferocious')!
        .holders.map(({ member }) => member.displayName),
    )
    expect(
      screen
        .getByRole('list', { name: 'Quién tiene Ferocious' })
        .closest<HTMLElement>('.community-badge'),
    ).toHaveTextContent(`${ferocious.length} de ${board.players}`)
  })

  it('groups the badges into ladders, easiest rung first', () => {
    render(<CommunityBadgesBoard board={board} />)

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((node) => node.textContent),
    ).toEqual([
      'Eventos jugados',
      'Top 4',
      'Top 4 seguidos',
      'Victorias',
      'Formatos jugados',
      'Formatos ganados',
      'Torneos grandes',
      'Clasificación final',
    ])

    const played = within(
      screen.getByRole('list', {
        name: 'Quién tiene las insignias de eventos jugados',
      }),
    )
      .getAllByRole('strong')
      .map((node) => node.textContent)

    expect(played).toEqual(['Vigilance', 'Persist', 'Saga'])
  })

  it('marks the rung of each badge with its metal', () => {
    const { container } = render(<CommunityBadgesBoard board={board} />)
    const tierOf = (name: string) =>
      container
        .querySelector(`[aria-label="Ver ${name} en grande"] .badge-mark`)
        ?.getAttribute('data-tier')

    expect(tierOf('Vigilance')).toBe('bronze')
    expect(tierOf('Persist')).toBe('silver')
    expect(tierOf('Saga')).toBe('gold')
  })

  it('opens a holder on their profile', () => {
    const onOpenMember = vi.fn()
    render(<CommunityBadgesBoard board={board} onOpenMember={onOpenMember} />)

    fireEvent.click(
      within(
        screen.getByRole('list', { name: 'Quién tiene Ferocious' }),
      ).getAllByRole('button')[0],
    )

    expect(onOpenMember).toHaveBeenCalledWith(
      board.badges.find(({ definition }) => definition.id === 'ferocious')!
        .holders[0].member.id,
    )
  })

  it('keeps a rung nobody holds inside its own ladder', () => {
    render(<CommunityBadgesBoard board={board} />)

    const titles = screen.getByRole('list', {
      name: 'Quién tiene las insignias de victorias',
    })

    // Legendary has no holder, yet it sits with the other wins rather than
    // in a list of leftovers: it is the next step, not a reject.
    expect(titles).toHaveTextContent('Legendary')
    expect(
      within(titles)
        .getAllByRole('strong')
        .find((node) => node.textContent === 'Legendary')
        ?.closest<HTMLElement>('.community-badge'),
    ).toHaveTextContent('Sin dueño')
    expect(
      screen.queryByRole('list', { name: 'Insignias que nadie tiene todavía' }),
    ).toBeNull()
    expect(
      screen.queryByRole('list', { name: 'Quién tiene Legendary' }),
    ).toBeNull()
  })
})

describe('CommunityBadgesBoard preview', () => {
  it('hands the tapped badge to the preview, unlocked on the board', () => {
    const onPreview = vi.fn()
    render(<CommunityBadgesBoard board={board} onPreview={onPreview} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver Ferocious en grande' }),
    )

    expect(onPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: expect.objectContaining({ id: 'ferocious' }),
        unlocked: true,
      }),
    )
  })
})

describe('SeasonBadgesPanel community view', () => {
  it('switches from my collection to who has what', () => {
    render(<SeasonBadgesPanel data={demoData} memberId="member-sergio" />)

    expect(screen.getByText('Tu colección')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Toda la comunidad' }))

    expect(screen.getByText('Quién tiene cada insignia')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: `${board.players} jugadores` }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Tu colección')).toBeNull()
  })

  it('offers no community switch on someone else profile', () => {
    render(
      <SeasonBadgesPanel
        data={demoData}
        memberId="member-sergio"
        perspective="other"
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Toda la comunidad' }),
    ).toBeNull()
  })
})
