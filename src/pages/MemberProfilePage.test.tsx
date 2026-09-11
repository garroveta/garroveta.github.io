import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MemberProfilePage } from './MemberProfilePage'
import { demoData } from '../data/demoData'
import type { DemoDataSet } from '../domain/types'

function renderProfile(
  memberId = 'member-sergio',
  data: DemoDataSet = demoData,
) {
  const member = data.members.find(({ id }) => id === memberId)!

  render(<MemberProfilePage data={data} member={member} onBack={vi.fn()} />)

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

  it('offers to share the profile with its badges showcased', () => {
    renderProfile()

    expect(
      screen.getByRole('button', { name: /Compartir ficha/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Copiar ficha/ }),
    ).toBeInTheDocument()
  })

  it('shows a WhatsApp the member chose to share, to every member', () => {
    renderProfile('member-marta')

    const contact = screen.getByRole('region', { name: 'Contacto' })

    expect(contact).toHaveTextContent('Disponible en el grupo CRC Delorean')
    expect(contact).toHaveTextContent(
      'Visible para todos los miembros validados',
    )
    expect(within(contact).queryByRole('link')).toBeNull()
  })

  it('turns a WhatsApp number into a link, and only a number', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const marta = data.members.find(({ id }) => id === 'member-marta')!
    marta.contactMethods = [
      { kind: 'whatsapp', label: 'WhatsApp', value: '+34 600 12 34 56' },
    ]

    renderProfile('member-marta', data)

    expect(
      within(screen.getByRole('region', { name: 'Contacto' })).getByRole(
        'link',
        { name: '+34 600 12 34 56' },
      ),
    ).toHaveAttribute('href', 'https://wa.me/34600123456')
  })

  it('keeps email and Discord off the public profile', () => {
    renderProfile('member-alex')

    expect(screen.queryByRole('region', { name: 'Contacto' })).toBeNull()
    expect(screen.queryByText(/Discord/)).toBeNull()
  })

  it('shows nothing when the member shared no WhatsApp', () => {
    renderProfile('member-carla')

    expect(screen.queryByRole('region', { name: 'Contacto' })).toBeNull()
  })

  it('lists what the member follows', () => {
    renderProfile()

    expect(screen.getByRole('list', { name: 'Intereses' })).toBeInTheDocument()
  })
})
