import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SeasonBadgesPanel } from './SeasonBadgesPanel'
import { demoData } from '../data/demoData'
import type { DemoDataSet } from '../domain/types'

function renderPanel(memberId = 'member-sergio', data: DemoDataSet = demoData) {
  render(<SeasonBadgesPanel data={data} memberId={memberId} />)
}

function badgeRow(name: string) {
  return screen
    .getByRole('button', { name: new RegExp(name) })
    .closest<HTMLElement>('.season-badge')!
}

describe('SeasonBadgesPanel', () => {
  it('leads with the collection count, not with an empty trophy case', () => {
    renderPanel()

    expect(screen.getByRole('heading', { name: '4 de 16' })).toBeInTheDocument()
    expect(screen.getByText('Tu colección')).toBeInTheDocument()
  })

  it('separates what is unlocked from what is still coming', () => {
    renderPanel()

    expect(
      within(
        screen.getByRole('list', { name: 'Insignias desbloqueadas' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(4)
    expect(
      within(
        screen.getByRole('list', { name: 'Insignias en progreso' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3)
  })

  it('puts the closest badges first so a newcomer never faces a wall', () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: /Ver las 12 insignias en progreso/ }),
    )

    const ratios = within(
      screen.getByRole('list', { name: 'Insignias en progreso' }),
    )
      .getAllByRole('listitem')
      .map((row) => {
        const counter = within(row).queryByText(/^\d+\/\d+$/)
        const [current, target] = (counter?.textContent ?? '0/1')
          .split('/')
          .map(Number)

        return current / target
      })

    expect(ratios[0]).toBeGreaterThan(0.5)
    expect(
      ratios.every((ratio, index) => index === 0 || ratios[index - 1] >= ratio),
    ).toBe(true)
  })

  it('opens a badge on its rule and on who already has it', () => {
    renderPanel()

    const row = badgeRow('Ferocious')

    expect(row).not.toHaveTextContent('Ferocidad')

    fireEvent.click(within(row).getByRole('button'))

    expect(row).toHaveTextContent(
      'Ferocidad: se activa si controlas una criatura con fuerza 4 o más.',
    )
    expect(
      within(row).getByRole('list', { name: 'Quién tiene Ferocious' }),
    ).toBeInTheDocument()
  })

  it('shows the rarity of every badge', () => {
    renderPanel()

    expect(badgeRow('Ferocious')).toHaveTextContent('4 de 15')
  })

  it('invites the first holder when nobody has the badge', () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: /Ver las 12 insignias en progreso/ }),
    )

    const row = badgeRow('Legendary')

    fireEvent.click(within(row).getByRole('button'))

    expect(row).toHaveTextContent('Nadie la tiene todavía')
  })

  it('offers to share a badge only once it is unlocked', () => {
    renderPanel()

    const unlocked = badgeRow('Ferocious')

    fireEvent.click(within(unlocked).getAllByRole('button')[0])

    expect(
      within(unlocked).getByRole('button', { name: /Compartir insignia/ }),
    ).toBeInTheDocument()

    const locked = badgeRow('Deathtouch')

    fireEvent.click(within(locked).getAllByRole('button')[0])

    expect(
      within(locked).queryByRole('button', { name: /Compartir insignia/ }),
    ).toBeNull()
  })

  it('keeps the locked badges folded until asked', () => {
    renderPanel()

    const toggle = screen.getByRole('button', {
      name: /Ver las 12 insignias en progreso/,
    })

    fireEvent.click(toggle)

    expect(
      within(
        screen.getByRole('list', { name: 'Insignias en progreso' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(12)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
