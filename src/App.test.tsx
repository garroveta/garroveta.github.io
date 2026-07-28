import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('presents the three prototype areas', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'MTG Community' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cartas' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Comunidad' }),
    ).toBeInTheDocument()
  })
})
