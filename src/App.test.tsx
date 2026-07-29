import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'
import { demoData } from './data/demoData'
import { createLocalDemoRepository } from './data/demoRepository'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
  })

  it('presents the mobile application navigation', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'FNM Pauper' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nuevo horario de verano' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '2 coincidencias nuevas' }),
    ).toBeInTheDocument()
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
    expect(
      screen.getByRole('heading', { name: 'Próximos eventos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'FNM Pauper' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('opens an event detail and returns to the agenda', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalles' })[0])

    expect(
      screen.getByRole('heading', { name: 'FNM Pauper' }),
    ).toBeInTheDocument()
    expect(screen.getByText('CRC Delorean')).toBeInTheDocument()
    expect(screen.getByText('24/24 confirmadas')).toBeInTheDocument()
    expect(
      screen.getByText('3 personas en lista de espera'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la agenda' }))

    expect(
      screen.getByRole('heading', { name: 'Próximos eventos' }),
    ).toBeInTheDocument()
  })

  it('registers for an available event and cancels the registration', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const hobbitCard = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')

    fireEvent.click(
      within(hobbitCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Inscribirme' }))

    expect(screen.getByText('Tu plaza está confirmada.')).toBeInTheDocument()
    expect(screen.getByText('9/30 confirmadas')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    )

    expect(
      screen.getByText('Tu inscripción se ha cancelado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('8/30 confirmadas')).toBeInTheDocument()
  })

  it('leaves and rejoins the waitlist of a full event', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const pauperCard = screen
      .getByRole('heading', { name: 'FNM Pauper' })
      .closest('article')

    fireEvent.click(
      within(pauperCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Salir de la lista de espera' }),
    )

    expect(
      screen.getByText('Has salido de la lista de espera.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('2 personas en lista de espera'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Unirme a la lista de espera',
      }),
    )

    expect(
      screen.getByText('Te has unido a la lista de espera.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('3 personas en lista de espera'),
    ).toBeInTheDocument()
  })

  it('browses the news feed and opens a publication', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Publicaciones para ti' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nuevo horario de verano' }),
    ).toBeInTheDocument()

    const summerNews = screen
      .getByRole('heading', { name: 'Nuevo horario de verano' })
      .closest('article')
    fireEvent.click(
      within(summerNews as HTMLElement).getByRole('button', { name: 'Leer' }),
    )

    expect(
      screen.getByText(/Durante el verano abrimos los miércoles y jueves/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Volver a las noticias' }),
    ).toBeInTheDocument()
  })

  it('switches between personalized news and tag filters', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.queryByRole('heading', {
        name: '¿Qué formato quieres jugar en agosto?',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Commander, Intercambios/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))

    expect(
      screen.getByRole('heading', {
        name: '¿Qué formato quieres jugar en agosto?',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Commander' }))

    expect(
      screen.getByRole('heading', { name: 'Nuevas mesas para Commander' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Reposición de sobres y accesorios',
      }),
    ).not.toBeInTheDocument()
  })

  it('switches and resets the demonstration role', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(
      screen.getByRole('heading', { name: 'CRC Delorean' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inca')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(
      screen.getByText('Datos guardados en este navegador'),
    ).toBeInTheDocument()

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

  it('restores the original local data from the profile', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.community.memberCount = 151
    repository.save(modifiedData)

    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.getByText('151')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(repository.load().community.memberCount).toBe(150)
  })
})
