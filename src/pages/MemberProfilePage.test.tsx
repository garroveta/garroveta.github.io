import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MemberProfilePage } from './MemberProfilePage'
import { demoData } from '../data/demoData'

function renderProfile(memberId = 'member-sergio') {
  const member = demoData.members.find(({ id }) => id === memberId)!

  render(<MemberProfilePage data={demoData} member={member} onBack={vi.fn()} />)

  return member
}

describe('MemberProfilePage', () => {
  it('introduces the member without speaking to them', () => {
    const member = renderProfile()

    expect(
      screen.getByRole('heading', { level: 1, name: member.displayName }),
    ).toBeInTheDocument()
    expect(screen.getByText(/En la comunidad desde/)).toBeInTheDocument()
    expect(screen.getByText('Su temporada')).toBeInTheDocument()
    expect(screen.getByText('Su colección')).toBeInTheDocument()
  })

  it('writes the projection in the third person', () => {
    renderProfile('member-carla')

    expect(screen.getByText(/subiría a la posición 2/)).toBeInTheDocument()
    expect(screen.queryByText(/subirías/)).toBeNull()
  })

  it('never says "tu" anywhere on someone else profile', () => {
    renderProfile()

    expect(document.body.textContent).not.toMatch(/\bTu colección\b/)
    expect(document.body.textContent).not.toMatch(/\bLideras\b/)
  })

  it('shows the season results of that member, not of the reader', () => {
    renderProfile('member-carla')

    const results = screen.getByRole('list', {
      name: 'Resultados de la temporada',
    })

    expect(within(results).getAllByRole('listitem')).toHaveLength(5)
    expect(
      screen.getByRole('heading', { name: 'Posición 3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('50 puntos comunidad · Temporada 2026'),
    ).toBeInTheDocument()
  })

  it('lists what the member follows', () => {
    renderProfile()

    expect(screen.getByRole('list', { name: 'Intereses' })).toBeInTheDocument()
  })
})
