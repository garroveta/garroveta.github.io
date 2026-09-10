import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HomePage } from './HomePage'
import { demoData } from '../data/demoData'
import type { DemoDataSet } from '../domain/types'

function renderPlayerHome(data: DemoDataSet = demoData) {
  const currentMember = data.members.find(
    ({ id }) => id === data.currentMemberId,
  )!

  render(
    <HomePage
      activeRole="jugador"
      currentMember={currentMember}
      data={data}
      dataStatus="ready"
      onNavigate={vi.fn()}
      onRetryData={vi.fn()}
    />,
  )
}

describe('HomePage', () => {
  it('opens the ranking card on the personal season', () => {
    renderPlayerHome()

    expect(
      screen.getByRole('heading', { name: 'Posición 7' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Temporada 2026/)).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /Ver clasificación/ }).length,
    ).toBeGreaterThan(0)
  })

  it('keeps the ranking card readable without an open season', () => {
    const data = structuredClone(demoData) as DemoDataSet
    data.rankingSeasons = []

    renderPlayerHome(data)

    expect(
      screen.getByRole('heading', { name: 'Sin temporada activa' }),
    ).toBeInTheDocument()
  })
})
