import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MarketplaceSyncPlan } from '../../data/cardSync'
import { demoData } from '../../data/demoData'
import type { Card, MarketplaceListing } from '../../domain/types'

import { MarketplaceSyncPreview } from './MarketplaceSyncPreview'

function buildCard(index: number): Card {
  return {
    id: `card-withdrawn-${index}`,
    name: `Carta número ${index}`,
    setName: 'Commander Masters',
    setCode: 'CMM',
    collectorNumber: `${index}`,
  }
}

function buildListing(index: number): MarketplaceListing {
  return {
    id: `listing-withdrawn-${index}`,
    communityId: demoData.community.id,
    memberId: demoData.currentMemberId,
    cardId: `card-withdrawn-${index}`,
    quantity: 1,
    language: 'es',
    condition: 'near_mint',
    finish: 'nonfoil',
    offerType: 'sale',
    status: 'available',
    createdAt: '2026-08-01T10:00:00+02:00',
  }
}

function renderPreview(withdrawnCount: number) {
  const listings = Array.from({ length: withdrawnCount }, (_, index) =>
    buildListing(index + 1),
  )
  const plan: MarketplaceSyncPlan = {
    added: [],
    updated: [],
    withdrawn: listings,
    conflicts: [],
    protectedListings: [],
    unresolvedLines: [],
    unchanged: 0,
  }

  render(
    <MarketplaceSyncPreview
      cards={Array.from({ length: withdrawnCount }, (_, index) =>
        buildCard(index + 1),
      )}
      listName="Cartas disponibles"
      plan={plan}
      onApply={vi.fn()}
      onBack={vi.fn()}
      onResolveAll={vi.fn()}
      onResolveConflict={vi.fn()}
    />,
  )

  return screen.getByLabelText(`Se retiran: ${withdrawnCount}`)
}

describe('MarketplaceSyncPreview', () => {
  it('reveals the rows a long group hides, and folds them back', () => {
    const group = renderPreview(11)

    expect(within(group).getAllByRole('listitem')).toHaveLength(8)
    expect(within(group).queryByText('Carta número 11')).not.toBeInTheDocument()

    const toggle = within(group).getByRole('button', {
      name: 'Ver las 3 restantes',
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(within(group).getAllByRole('listitem')).toHaveLength(11)
    expect(within(group).getByText('Carta número 11')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(within(group).getByRole('button', { name: 'Ver menos' }))

    expect(within(group).getAllByRole('listitem')).toHaveLength(8)
  })

  it('keeps an expanded group scrollable so the actions stay reachable', () => {
    const group = renderPreview(40)

    fireEvent.click(
      within(group).getByRole('button', { name: 'Ver las 32 restantes' }),
    )

    expect(within(group).getByRole('list')).toHaveClass('is-expanded')
    expect(
      screen.getByRole('button', { name: 'Aplicar los cambios' }),
    ).toBeInTheDocument()
  })

  it('shows no toggle when the group fits', () => {
    const group = renderPreview(4)

    expect(within(group).getAllByRole('listitem')).toHaveLength(4)
    expect(within(group).queryByRole('button')).not.toBeInTheDocument()
  })
})
