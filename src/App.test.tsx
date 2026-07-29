import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('presents the mobile application navigation', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Eventos/ })).not.toHaveLength(0)
    expect(screen.getAllByRole('link', { name: /Cartas/ })).not.toHaveLength(0)
    expect(screen.getAllByRole('link', { name: /Noticias/ })).not.toHaveLength(
      0,
    )
    expect(screen.getByRole('link', { name: /Perfil/ })).toBeInTheDocument()
  })

  it('opens a section from the main navigation', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('switches and resets the demonstration role', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(
      screen.getByRole('heading', { name: 'CRC Delorean' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inca')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))

    expect(screen.getByLabelText('Vista actual: Gerente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerente/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(screen.getByLabelText('Vista actual: Jugador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jugador/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
