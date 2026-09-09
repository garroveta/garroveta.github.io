import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ShareActions } from './ShareActions'

describe('ShareActions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens WhatsApp with the supplied text and reports success', () => {
    const open = vi.fn().mockReturnValue({})
    vi.stubGlobal('open', open)

    render(<ShareActions shareText="Hola comunidad" />)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }))

    expect(open).toHaveBeenCalledWith(
      'https://wa.me/?text=Hola%20comunidad',
      '_blank',
      'noopener,noreferrer',
    )
    expect(
      screen.getByText(
        'WhatsApp se ha abierto. Elige el grupo o contacto y pulsa enviar.',
      ),
    ).toBeInTheDocument()
  })

  it('can copy different text and updates its label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    render(
      <ShareActions
        copiedLabel="Enlace copiado"
        copyText="https://example.com/secret"
        shareText="Mensaje con contexto"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copiar mensaje' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://example.com/secret'),
    )
    expect(screen.getByText('Enlace copiado')).toBeInTheDocument()
  })

  it('supports icon-only actions with external feedback', () => {
    const onFeedback = vi.fn()
    vi.stubGlobal('open', vi.fn().mockReturnValue(null))

    render(
      <ShareActions
        hideLabels
        onFeedback={onFeedback}
        shareAriaLabel="Compartir publicación"
        shareText="Publicación"
        showCopy={false}
        showFeedback={false}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Compartir publicación' }),
    )

    expect(onFeedback).toHaveBeenCalledWith(
      'No se ha podido abrir WhatsApp. Prueba a copiar el mensaje.',
    )
  })
})
