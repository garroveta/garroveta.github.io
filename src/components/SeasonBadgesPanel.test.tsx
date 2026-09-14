import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SeasonBadgesPanel } from './SeasonBadgesPanel'
import { demoData } from '../data/demoData'
import type { DemoDataSet } from '../domain/types'

function renderPanel(memberId = 'member-sergio', data: DemoDataSet = demoData) {
  render(<SeasonBadgesPanel data={data} memberId={memberId} />)
}

/** Every rung lives in the catalogue, folded away until asked for. */
function openCatalogue() {
  fireEvent.click(screen.getByRole('button', { name: 'Ver todo el catálogo' }))
}

function badgeRow(name: string) {
  return screen
    .getByRole('button', { name: new RegExp(`^${name}`) })
    .closest<HTMLElement>('.season-badge')!
}

/** The row holds two buttons: the mark (preview) and the details (expand). */
function expand(row: HTMLElement) {
  fireEvent.click(
    within(row)
      .getAllByRole('button')
      .find((button) => button.hasAttribute('aria-expanded'))!,
  )
}

describe('SeasonBadgesPanel', () => {
  it('counts what is held rather than what is missing', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', { name: '4 insignias' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 oro · 2 plata · 1 bronce')).toBeInTheDocument()
    expect(screen.getByText('Tu colección')).toBeInTheDocument()
  })

  it('shows the earned badges as a case, not as rows', () => {
    renderPanel()

    const vitrine = within(
      screen.getByRole('list', { name: 'Insignias desbloqueadas' }),
    )

    expect(vitrine.getAllByRole('listitem')).toHaveLength(4)
    expect(
      vitrine.getByRole('button', { name: 'Ver Ferocious en grande' }),
    ).toBeInTheDocument()
  })

  it('offers one next rung per ladder, closest first', () => {
    renderPanel()

    const rows = within(
      screen.getByRole('list', { name: 'Tu próximo paso' }),
    ).getAllByRole('listitem')
    const ratios = rows
      .map((row) => within(row).queryByText(/^\d+ de \d+$/)?.textContent)
      .filter((counter): counter is string => Boolean(counter))
      .map((counter) => {
        const [current, target] = counter.split(' de ').map(Number)

        return current! / target!
      })

    // One per ladder that still has a rung to climb, never two from the same;
    // Melee is held, so its ladder is done and absent.
    expect(rows).toHaveLength(7)
    expect(
      ratios.every(
        (ratio, index) => index === 0 || ratios[index - 1]! >= ratio,
      ),
    ).toBe(true)
  })

  it('reads a live podium place as provisional, never as earned', () => {
    // Sergio leads the active season, Biel is second, Nora fourth.
    renderPanel()

    const leader = within(
      screen.getByRole('list', { name: 'Tu próximo paso' }),
    ).getAllByRole('listitem')[0]!

    // Already first: the top rung stays the target, to defend until closing.
    expect(leader).toHaveTextContent('Monarch')
    expect(leader).toHaveTextContent('Provisional')
    expect(leader).toHaveTextContent('Vas 1.º de 15 · mantén el puesto')
    // Provisional is never a badge: the case only holds what was earned.
    expect(
      within(
        screen.getByRole('list', { name: 'Insignias desbloqueadas' }),
      ).queryByRole('button', { name: /Monarch/ }),
    ).toBeNull()
  })

  it('points a podium member at the rung above, and a chaser at the podium', () => {
    const { unmount } = render(
      <SeasonBadgesPanel data={demoData} memberId="member-biel" />,
    )
    const rungOf = (name: string) =>
      within(screen.getByRole('list', { name: 'Tu próximo paso' }))
        .getAllByRole('listitem')
        .find((row) => row.textContent?.includes(name))

    // Second: Paragon is provisionally held, so the ladder aims at Monarch.
    expect(rungOf('Monarch')).toHaveTextContent(
      'Vas 2.º de 15 · te falta 1 puesto',
    )
    expect(rungOf('Paragon')).toBeUndefined()

    unmount()
    render(<SeasonBadgesPanel data={demoData} memberId="member-nora" />)

    // Fourth: the podium itself is still the target.
    expect(rungOf('Paragon')).toHaveTextContent(
      'Vas 4.º de 15 · te falta 1 puesto',
    )
    expect(rungOf('Paragon')).not.toHaveTextContent('Provisional')
  })

  it('names the ladder a next rung belongs to', () => {
    renderPanel()

    const topFour = within(
      screen.getByRole('list', { name: 'Tu próximo paso' }),
    )
      .getAllByRole('listitem')
      .find((row) => row.textContent?.includes("City's Blessing"))!

    // Ferocious is already held, so the ladder points at the rung above it.
    expect(topFour).toHaveTextContent('Top 4')
    expect(topFour).toHaveTextContent('7 de 10')
  })

  it('says which ladders are finished', () => {
    renderPanel()

    expect(screen.getByText(/^Completas:/)).toHaveTextContent(
      'Completas: Torneos grandes',
    )
  })

  it('keeps the whole catalogue folded until asked, grouped by ladder', () => {
    renderPanel()

    expect(screen.queryByText('Legendary')).toBeNull()

    openCatalogue()

    expect(
      screen.getByRole('list', { name: 'Insignias de eventos jugados' }),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('.season-badge')).toHaveLength(17)
    expect(
      screen.getByRole('button', { name: 'Ocultar el catálogo' }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens a badge on its rule and on who already has it', () => {
    renderPanel()
    openCatalogue()

    const row = badgeRow('Ferocious')

    expect(row).not.toHaveTextContent('Ferocidad')

    expand(row)

    expect(row).toHaveTextContent(
      'Ferocidad: se activa si controlas una criatura con fuerza 4 o más.',
    )
    expect(
      within(row).getByRole('list', { name: 'Quién tiene Ferocious' }),
    ).toBeInTheDocument()
  })

  it('shows the rarity of every badge in the catalogue', () => {
    renderPanel()
    openCatalogue()

    expect(badgeRow('Ferocious')).toHaveTextContent('4 de 15')
  })

  it('invites the first holder when nobody has the badge', () => {
    renderPanel()
    openCatalogue()

    const row = badgeRow('Legendary')

    expand(row)

    expect(row).toHaveTextContent('Nadie la tiene todavía')
  })

  it('offers to share a badge from its dialog, only once it is unlocked', () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver Ferocious en grande' }),
    )

    const held = screen.getByRole('dialog', { name: 'Ferocious' })

    expect(
      within(held).getByRole('button', { name: /Compartir insignia/ }),
    ).toBeInTheDocument()

    fireEvent.click(
      within(held).getByRole('button', { name: 'Cerrar insignia' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Ver Deathtouch en grande' }),
    )

    expect(
      within(screen.getByRole('dialog', { name: 'Deathtouch' })).queryByRole(
        'button',
        { name: /Compartir insignia/ },
      ),
    ).toBeNull()
  })

  it('opens the badge large when its mark is tapped, and closes on Escape', () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver Ferocious en grande' }),
    )

    const dialog = screen.getByRole('dialog', { name: 'Ferocious' })

    expect(dialog).toHaveTextContent('Termina 4 veces en el Top 4')
    expect(dialog).toHaveTextContent(
      'Ferocidad: se activa si controlas una criatura con fuerza 4 o más.',
    )
    expect(
      within(dialog).getByRole('img', { name: 'Ferocious, ampliada' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the distance in the preview of a locked badge', () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver Deathtouch en grande' }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Deathtouch' }),
    ).toHaveTextContent('2 de 3')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar insignia' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
