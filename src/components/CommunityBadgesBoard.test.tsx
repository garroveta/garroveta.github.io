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
  it('names every holder of a badge, rarest badge first', () => {
    render(<CommunityBadgesBoard board={board} />)

    const rows = within(
      screen.getByRole('list', { name: 'Quién tiene cada insignia' }),
    ).getAllByRole('listitem', { name: '' })
    const claimed = board.badges.filter(({ holders }) => holders.length > 0)

    expect(rows.length).toBeGreaterThanOrEqual(claimed.length)

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

  it('puts the rarest badge before the common one', () => {
    render(<CommunityBadgesBoard board={board} />)

    const headings = within(
      screen.getByRole('list', { name: 'Quién tiene cada insignia' }),
    )
      .getAllByRole('strong')
      .map((node) => node.textContent)
    const counts = headings.map(
      (name) =>
        board.badges.find(({ definition }) => definition.name === name)!.holders
          .length,
    )

    expect(counts).toEqual([...counts].sort((a, b) => a - b))
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

  it('lists what nobody has yet, compactly', () => {
    render(<CommunityBadgesBoard board={board} />)

    const unclaimed = screen.getByRole('list', {
      name: 'Insignias que nadie tiene todavía',
    })

    expect(unclaimed).toHaveTextContent('Legendary')
    // Only the marks are tappable there: no holder to open.
    expect(
      within(unclaimed)
        .getAllByRole('button')
        .every((button) =>
          button.getAttribute('aria-label')?.startsWith('Ver '),
        ),
    ).toBe(true)
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
