import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContactMethodList } from './ContactMethodList'

describe('ContactMethodList', () => {
  it('links a phone number to WhatsApp and an address to mail', () => {
    render(
      <ContactMethodList
        contactMethods={[
          { kind: 'whatsapp', label: 'WhatsApp', value: '600 12 34 56' },
          { kind: 'email', label: 'Correo', value: 'ana@example.com' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: '600 12 34 56' })).toHaveAttribute(
      'href',
      'https://wa.me/600123456',
    )
    expect(
      screen.getByRole('link', { name: 'ana@example.com' }),
    ).toHaveAttribute('href', 'mailto:ana@example.com')
  })

  it('never turns free text or a Discord handle into a link', () => {
    render(
      <ContactMethodList
        contactMethods={[
          {
            kind: 'whatsapp',
            label: 'WhatsApp',
            value: 'Pregunta en el grupo',
          },
          { kind: 'discord', label: 'Discord', value: 'ana#0001' },
        ]}
      />,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Pregunta en el grupo')).toBeInTheDocument()
    expect(screen.getByText('ana#0001')).toBeInTheDocument()
  })

  it('says so when there is nothing to show', () => {
    render(<ContactMethodList contactMethods={[]} />)

    expect(
      screen.getByText(
        'Este miembro no ha indicado ninguna forma de contacto.',
      ),
    ).toBeInTheDocument()
  })
})
