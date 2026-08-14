import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { reserveMarketplaceListing } from './data/cardLifecycle'
import { demoData } from './data/demoData'
import { createLocalDemoRepository } from './data/demoRepository'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('presents the mobile application navigation', () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: 'Garroveta, inicio' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Torneo Modern' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nuevo horario de verano' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '4 coincidencias nuevas' }),
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

  it('opens the latest community event standings', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(
      screen.getByRole('heading', { name: 'Clasificaciones' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos eventos' }))

    expect(
      screen.getByRole('heading', { name: 'Win a Box Pauper' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Carla Pons Alcover')).not.toHaveLength(0)
    expect(
      screen.getByRole('columnheader', { name: 'Pts evento' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Pts comunidad' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', {
        name: 'Victorias / derrotas / empates',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('9', { selector: '.event-points-value' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('+10', { selector: '.community-points-value' }),
    ).toBeInTheDocument()

    const mobileRanking = screen.getByRole('region', {
      name: 'Clasificación móvil de Win a Box Pauper',
    })
    const firstMobileEntry = within(mobileRanking).getAllByRole('listitem')[0]
    expect(
      within(firstMobileEntry).getByLabelText(
        '3 victorias, 0 derrotas y 0 empates',
      ),
    ).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByLabelText('9 puntos del evento'),
    ).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByLabelText('Más 10 puntos comunidad'),
    ).toBeInTheDocument()
    expect(within(firstMobileEntry).queryByText('%VPO')).not.toBeInTheDocument()

    fireEvent.click(
      within(firstMobileEntry).getByRole('button', {
        name: 'Desempates de Carla Pons Alcover',
      }),
    )

    expect(within(firstMobileEntry).getByText('%VPO')).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByRole('button', {
        name: 'Ocultar de Carla Pons Alcover',
      }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(
      screen.getByRole('button', {
        name: /FNM Pauper.*24 de julio de 2026/,
      }),
    )

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
    expect(screen.getByText('16 participantes')).toBeInTheDocument()
    expect(screen.getAllByText('Sergio Gil')).not.toHaveLength(0)
  })

  it('filters the cumulative community ranking', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(screen.getByRole('tab', { name: 'Comunidad' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.queryByText('El formato más activo')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Top 5 de la comunidad'),
    ).not.toBeInTheDocument()

    const rankingFilters = screen.getByText('Filtros').closest('details')
    expect(rankingFilters).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Modificar'))
    expect(rankingFilters).toHaveAttribute('open')

    expect(
      screen.getByRole('heading', {
        name: 'MTG · Todos los formatos · Todos los eventos',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Formato')).toHaveValue('')

    const rankingTable = screen.getByRole('table', {
      name: 'Clasificación acumulada',
    })
    const rankingLegend = screen.getByRole('note', {
      name: 'Leyenda del ranking comunitario',
    })
    expect(rankingLegend).toHaveTextContent('Ev. eventos')
    expect(rankingLegend).toHaveTextContent('Vict. victorias')
    expect(rankingLegend).toHaveTextContent('Pod. podios')
    expect(rankingLegend).toHaveTextContent('Pts puntos comunidad')
    expect(
      within(rankingTable).getByText('Carla Pons Alcover'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tipo de evento'), {
      target: { value: 'event-kind-fnm' },
    })

    expect(
      screen.getByRole('heading', {
        name: 'MTG · Todos los formatos · FNM',
      }),
    ).toBeInTheDocument()
    expect(
      within(rankingTable).getByRole('row', {
        name: /1 Sergio Gil 5 2 5 38 puntos comunidad/,
      }),
    ).toBeInTheDocument()

    expect(within(rankingTable).getAllByRole('row')).toHaveLength(11)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }))
    expect(within(rankingTable).getAllByRole('row')).toHaveLength(16)
    expect(
      screen.getByRole('button', { name: 'Mostrar Top 10' }),
    ).toBeInTheDocument()
  })

  it('opens an event detail and returns to the agenda', () => {
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

  it('filters events by game and activity', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'One Piece' }))

    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'FNM Pauper' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Torneo' }))

    expect(screen.getByText('1 programados')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(
      screen.getByRole('heading', { name: 'FNM Pauper' }),
    ).toBeInTheDocument()
  })

  it('saves the player favorite games from the profile', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    const onePieceButton = screen.getByRole('button', { name: /One Piece/ })
    const gundamButton = screen.getByRole('button', { name: /Gundam/ })

    expect(onePieceButton).toHaveAttribute('aria-pressed', 'true')
    expect(gundamButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(onePieceButton)
    fireEvent.click(gundamButton)

    expect(onePieceButton).toHaveAttribute('aria-pressed', 'false')
    expect(gundamButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument()
  })

  it('shows the operational dashboard in manager mode', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))

    expect(
      screen.getByRole('heading', { name: 'Hola, Tomás' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Acciones prioritarias' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Últimas publicaciones' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('3 personas en lista de espera.'),
    ).toBeInTheDocument()
    const waitlistMetric = screen
      .getByText('En lista de espera')
      .closest('article')
    expect(
      within(waitlistMetric as HTMLElement).getByText('3'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '2 coincidencias nuevas' }),
    ).not.toBeInTheDocument()
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

  it('lets a manager publish a targeted communication', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Nueva publicación' }))

    fireEvent.change(screen.getByLabelText('Tipo'), {
      target: { value: 'urgent' },
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Cambio de sala' },
    })
    fireEvent.change(screen.getByLabelText('Resumen'), {
      target: { value: 'El torneo se jugará en la sala principal.' },
    })
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: {
        value:
          'Por motivos de organización, todas las rondas se jugarán en la sala principal.',
      },
    })
    fireEvent.click(screen.getByLabelText('Commander'))
    fireEvent.click(screen.getByLabelText(/Fijar publicación/))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(
      screen.getByText('La publicación ya está visible.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Cambio de sala' }),
    ).toBeInTheDocument()
    const publishedNews = screen
      .getByRole('heading', { name: 'Cambio de sala' })
      .closest('article')
    expect(
      within(publishedNews as HTMLElement).getByText(/Tomás/),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().newsPosts.at(-1),
    ).toMatchObject({
      title: 'Cambio de sala',
      type: 'urgent',
      tagIds: ['tag-commander'],
      pinned: true,
    })
  })

  it('lets a manager publish a multi-game event', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))

    fireEvent.change(screen.getByLabelText('Juego'), {
      target: { value: 'game-one-piece' },
    })
    fireEvent.change(screen.getByLabelText('Tipo de actividad'), {
      target: { value: 'league' },
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Liga One Piece' },
    })
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Cuatro jornadas abiertas a la comunidad.' },
    })
    fireEvent.change(screen.getByLabelText('Plazas'), {
      target: { value: '16' },
    })
    fireEvent.click(screen.getByLabelText('Principiantes'))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar evento' }))

    expect(
      screen.getByText('El evento ya aparece en la agenda.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: 'Liga One Piece' })[0],
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().events.at(-1),
    ).toMatchObject({
      gameId: 'game-one-piece',
      type: 'league',
      title: 'Liga One Piece',
      capacity: 16,
      tagIds: ['tag-principiantes'],
    })
  })

  it('lets a manager record attendance and release a participant place', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const commanderCard = screen
      .getByRole('heading', { name: 'Noche de Commander' })
      .closest('article')
    fireEvent.click(
      within(commanderCard as HTMLElement).getByRole('button', {
        name: /Inscripciones/,
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Participantes' }),
    ).toBeInTheDocument()
    const alexParticipant = screen.getByText('Álex Romero').closest('article')
    fireEvent.click(
      within(alexParticipant as HTMLElement).getByRole('button', {
        name: 'Registrar asistencia',
      }),
    )

    expect(
      within(alexParticipant as HTMLElement).getByText('Presente'),
    ).toBeInTheDocument()
    expect(
      within(alexParticipant as HTMLElement).getByRole('button', {
        name: 'Anular asistencia',
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      within(alexParticipant as HTMLElement).getByRole('button', {
        name: 'Liberar plaza',
      }),
    )

    expect(alexParticipant).not.toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .registrations.find(({ id }) => id === 'registration-alex-commander')
        ?.status,
    ).toBe('cancelled')
  })

  it('lets a manager edit, manage registrations and delete events', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    const eventRow = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')
    fireEvent.click(
      within(eventRow as HTMLElement).getByRole('button', {
        name: /Inscripciones/,
      }),
    )
    fireEvent.change(screen.getByLabelText('Añadir una inscripción'), {
      target: { value: 'member-marta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    expect(screen.getByText('Marta Soler')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(
      within(eventRow as HTMLElement).getByRole('button', {
        name: 'Modificar Presentación: The Hobbit',
      }),
    )
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Presentación: The Hobbit · tarde' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText('Los cambios se han guardado.')).toBeInTheDocument()

    const updatedRow = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit · tarde' })
      .closest('article')
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Eliminar Presentación: The Hobbit · tarde',
      }),
    )
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Confirmar',
      }),
    )
    expect(
      screen.queryByRole('heading', {
        name: 'Presentación: The Hobbit · tarde',
      }),
    ).not.toBeInTheDocument()
  })

  it('browses marketplace offers and the member wanted list', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    const marketplaceTable = screen.getByRole('table', {
      name: 'Ofertas de cartas disponibles',
    })
    expect(
      within(marketplaceTable).queryByRole('columnheader', {
        name: 'Miembro',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(marketplaceTable).getAllByRole('row', { name: /Sol Ring/ }),
    ).toHaveLength(3)
    expect(
      within(marketplaceTable).getAllByText('Diego Sánchez'),
    ).not.toHaveLength(0)
    expect(screen.getByText('1–20 de 159')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('21–40 de 159')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByText('1–20 de 159')).toBeInTheDocument()

    fireEvent.click(
      within(marketplaceTable).getAllByRole('button', {
        name: 'Ver cartas de Marta Soler',
      })[0],
    )
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(
      screen.getByRole('heading', { name: 'Marta Soler' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/cartas publicadas en Garroveta/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las cartas' }))
    expect(
      screen.getByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ofertas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.location.hash).toBe('#cartas?view=market')

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: 'Sheoldred' } },
    )

    expect(
      screen.getByRole('row', { name: /Sheoldred, the Apocalypse/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Sol Ring/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas buscadas' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Sol Ring' })).toHaveLength(3)
    expect(
      screen.getAllByRole('heading', { name: 'The One Ring' }),
    ).toHaveLength(2)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ampliar Sol Ring' })[0],
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reserves a marketplace quantity from the compact offer sheet', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))

    const marketplaceTable = screen.getByRole('table', {
      name: 'Ofertas de cartas disponibles',
    })
    fireEvent.click(
      within(marketplaceTable).getByRole('row', {
        name: 'Abrir oferta de Sol Ring de Marta Soler',
      }),
    )

    const offerDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(offerDialog).getByText('Ver las cartas de Marta Soler'),
    ).toBeInTheDocument()
    fireEvent.change(
      within(offerDialog).getByLabelText('Cantidad a reservar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(offerDialog).getByRole('button', {
        name: 'Reservar 2 cartas',
      }),
    )

    expect(
      within(offerDialog).getByText('2 cartas reservadas para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
      reservedQuantity: 2,
    })

    expect(
      within(offerDialog).getByLabelText('Cantidad a cancelar'),
    ).toHaveValue('1')
    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cancelar 1 carta' }),
    )
    expect(
      within(offerDialog).getByText('1 carta reservada para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 1 })

    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cancelar 1 carta' }),
    )
    expect(
      within(offerDialog).getByRole('button', { name: 'Reservar 2 cartas' }),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta')
        ?.reservedQuantity,
    ).toBeUndefined()

    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    fireEvent.click(
      within(marketplaceTable).getByRole('row', {
        name: 'Abrir oferta de Sol Ring de Diego Sánchez',
      }),
    )
    const singleCardDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(singleCardDialog).getByLabelText('Cantidad a reservar'),
    ).toBeDisabled()
    expect(
      within(singleCardDialog).getByLabelText('Cantidad a reservar'),
    ).toHaveValue('1')
    expect(
      within(singleCardDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    ).toBeInTheDocument()
  })

  it('publishes a card offer in the local marketplace', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar carta' }))
    fireEvent.change(screen.getByLabelText('Carta'), {
      target: { value: 'card-esper-sentinel' },
    })
    fireEvent.change(screen.getByLabelText('Cantidad'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    expect(
      screen.getByText('Tu carta ya aparece en las ofertas.'),
    ).toBeInTheDocument()
    const publishedListing = screen.getByRole('row', {
      name: /Esper Sentinel/,
    })
    expect(
      within(publishedListing).getByText('Álex Romero'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1),
    ).toMatchObject({
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      quantity: 2,
    })
  })

  it('switches marketplace offers to a readable Scryfall image gallery', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Imágenes' }))

    expect(screen.getByLabelText('Galería de ofertas')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(12)
    expect(screen.getAllByRole('img')[0].getAttribute('src')).toContain(
      'https://cards.scryfall.io/large/',
    )
    expect(screen.getByText('1–12 de 159')).toBeInTheDocument()

    const martaGalleryCard = screen
      .getByRole('button', {
        name: 'Reservar Sol Ring de Marta Soler',
      })
      .closest('article')!
    expect(within(martaGalleryCard).getByText('Cantidad')).toBeInTheDocument()
    expect(within(martaGalleryCard).getByText('2')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reservar Sol Ring de Marta Soler',
      }),
    )
    expect(screen.getByRole('dialog', { name: 'Sol Ring' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar oferta' }))

    fireEvent.click(screen.getByRole('button', { name: '4 por fila' }))
    expect(screen.getAllByRole('img')).toHaveLength(20)
    expect(screen.getByText('1–20 de 159')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Cantidad 2').length).toBeGreaterThan(0)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ampliar Sol Ring' })[0],
    )
    const imageDialog = screen.getByRole('dialog')
    expect(imageDialog).toBeInTheDocument()
    expect(
      within(imageDialog).getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))
    expect(
      screen.getByRole('table', { name: 'Ofertas de cartas disponibles' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1–20 de 159')).toBeInTheDocument()

    const firstTableRow = screen.getAllByRole('row')[1]
    fireEvent.click(
      within(firstTableRow).getByRole('button', { name: 'Ampliar Sol Ring' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('imports a wanted-card list and reports unknown names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [], not_found: [{}] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: {
        value: '2x Rhystic Study\nEsper Sentinel\nCarta desconocida',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))
    const rhysticQuantity = await screen.findByLabelText(
      'Cantidad buscada de Rhystic Study',
    )
    fireEvent.change(rhysticQuantity, { target: { value: '4' } })
    fireEvent.change(
      await screen.findByLabelText('Idioma para Rhystic Study'),
      { target: { value: 'en' } },
    )
    fireEvent.change(screen.getByLabelText('Acabado para Rhystic Study'), {
      target: { value: 'foil' },
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Importar búsquedas' }),
    )

    expect(
      screen.getByText(
        '2 búsquedas importadas. No reconocidas: Carta desconocida.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Rhystic Study' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Esper Sentinel' }),
    ).toBeInTheDocument()
    const storedWantedCards = createLocalDemoRepository(
      window.localStorage,
    ).load().wantedCards
    expect(
      storedWantedCards.filter(
        ({ memberId }) => memberId === demoData.currentMemberId,
      ),
    ).toHaveLength(9)
    expect(
      storedWantedCards.find(
        ({ memberId, cardId }) =>
          memberId === demoData.currentMemberId &&
          cardId === 'card-rhystic-study',
      ),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['en'],
      acceptedFinishes: ['foil'],
    })
  })

  it('imports an editable list of marketplace offers', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ofertas' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: { value: '2 Sol Ring (CMM) 410\nRhystic Study' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))

    const quantityInput = await screen.findByLabelText('Cantidad de Sol Ring')
    fireEvent.change(quantityInput, { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Idioma de Sol Ring'), {
      target: { value: 'fr' },
    })
    fireEvent.change(screen.getByLabelText('Estado de Sol Ring'), {
      target: { value: 'good' },
    })
    fireEvent.change(screen.getByLabelText('Acabado de Sol Ring'), {
      target: { value: 'foil' },
    })
    fireEvent.change(screen.getByLabelText('Precio de Sol Ring'), {
      target: { value: '4.75' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar ofertas' }))

    expect(screen.getByText('2 ofertas publicadas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mis ofertas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const importedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })
      .at(-1)
      ?.closest('article')
    expect(importedSolRing).toBeTruthy()
    expect(
      within(importedSolRing as HTMLElement).getByText('3 · Francés'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(
          ({ memberId, language, condition, finish }) =>
            memberId === demoData.currentMemberId &&
            language === 'fr' &&
            condition === 'good' &&
            finish === 'foil',
        ),
    ).toMatchObject({ quantity: 3, priceEur: 4.75 })
  })

  it('creates and displays automatic matches after an import', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Tus coincidencias' }),
    ).toBeInTheDocument()
    expect(screen.getByText('6 ofertas compatibles')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()

    const solRingGroup = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    expect(
      within(solRingGroup as HTMLElement).getByText('Diego Sánchez'),
    ).toBeInTheDocument()
    expect(
      within(solRingGroup as HTMLElement).getByText('Marta Soler'),
    ).toBeInTheDocument()
    expect(
      within(solRingGroup as HTMLElement).getByText('Sergio Gil'),
    ).toBeInTheDocument()

    fireEvent.click(
      within(solRingGroup as HTMLElement).getByRole('button', {
        name: 'Ampliar Sol Ring',
      }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))

    fireEvent.click(screen.getByRole('button', { name: 'Por miembro' }))
    const diegoGroup = screen
      .getByRole('heading', { name: 'Diego Sánchez' })
      .closest('article')
    expect(
      within(diegoGroup as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    ).toBeInTheDocument()
    expect(
      within(diegoGroup as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de The One Ring con Diego Sánchez',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Por carta' }))

    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: { value: 'Rhystic Study' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))
    fireEvent.change(
      await screen.findByLabelText('Idioma para Rhystic Study'),
      { target: { value: 'en' } },
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Importar búsquedas' }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Coincidencias/ }))

    await waitFor(() =>
      expect(screen.getByText('7 ofertas compatibles')).toBeInTheDocument(),
    )
    const newMatch = screen
      .getByRole('heading', { name: 'Rhystic Study' })
      .closest('article')
    expect(
      within(newMatch as HTMLElement).getByText('Marta Soler'),
    ).toBeInTheDocument()
    expect(
      within(newMatch as HTMLElement).getByText(/Nueva/),
    ).toBeInTheDocument()
  })

  it('opens a match and reveals the seller contact authorized for it', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    const solRingMatch = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    fireEvent.click(
      within(solRingMatch as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Diego Sánchez' }),
    ).toBeInTheDocument()
    expect(screen.getByText('diego-modern')).toBeInTheDocument()
    expect(
      screen.getByText(/solo se muestran porque existe una coincidencia/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reservar carta' }))
    const matchReservationDialog = screen.getByRole('dialog', {
      name: 'Sol Ring',
    })
    fireEvent.click(
      within(matchReservationDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    )
    fireEvent.click(
      within(matchReservationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByRole('button', { name: 'Cancelar reserva' }),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    const matchCancellationDialog = screen.getByRole('dialog', {
      name: 'Sol Ring',
    })
    expect(
      within(matchCancellationDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeDisabled()
    fireEvent.click(
      within(matchCancellationDialog).getByRole('button', {
        name: 'Cancelar 1 carta',
      }),
    )
    fireEvent.click(
      within(matchCancellationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByRole('button', { name: 'Reservar carta' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar Sol Ring' }))
    const imageDialog = screen.getByRole('dialog')
    expect(
      within(imageDialog).getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(within(imageDialog).getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('cards.scryfall.io'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .cardMatches.find(({ id }) => id === 'match-alex-sol-ring')?.status,
    ).toBe('seen')

    fireEvent.click(
      screen.getByRole('button', { name: 'Volver a las coincidencias' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Tus coincidencias' }),
    ).toBeInTheDocument()
  })

  it('records a completed operation from its match detail', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    const solRingMatch = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    fireEvent.click(
      within(solRingMatch as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Marcar operación realizada',
      }),
    )

    expect(screen.getByText('Operación registrada')).toBeInTheDocument()
    expect(
      screen.getByText('Operación realizada con Diego Sánchez.'),
    ).toBeInTheDocument()

    const storedData = createLocalDemoRepository(window.localStorage).load()
    expect(storedData.cardDeals).toEqual([
      expect.objectContaining({
        matchId: 'match-alex-sol-ring',
        type: 'sale',
      }),
    ])
    expect(
      storedData.cardMatches.find(({ id }) => id === 'match-alex-sol-ring')
        ?.status,
    ).toBe('completed')
  })

  it('pauses searches and manages the lifecycle of an owned offer', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    const wantedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })[0]
      .closest('article')
    fireEvent.click(
      within(wantedSolRing as HTMLElement).getByRole('button', {
        name: 'Pausar búsqueda',
      }),
    )
    expect(
      within(wantedSolRing as HTMLElement).getByText('En pausa'),
    ).toBeInTheDocument()
    expect(screen.getByText('La búsqueda está en pausa.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Publicar carta' }))
    fireEvent.change(screen.getByLabelText('Carta'), {
      target: { value: 'card-esper-sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mis ofertas/ }))

    const ownedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article')
    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Marcar reservada',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Reservada'),
    ).toBeInTheDocument()

    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Cerrada'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1)
        ?.status,
    ).toBe('completed')
  })

  it('edits wanted cards and offers after publication', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    const wantedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })[0]
      .closest('article') as HTMLElement
    fireEvent.click(wantedSolRing.querySelector('summary')!)
    fireEvent.change(
      within(wantedSolRing).getByLabelText(
        'Editar cantidad buscada de Sol Ring',
      ),
      { target: { value: '4' } },
    )
    fireEvent.change(
      within(wantedSolRing).getByLabelText('Editar idioma de Sol Ring'),
      { target: { value: 'fr' } },
    )
    fireEvent.change(
      within(wantedSolRing).getByLabelText('Editar acabado de Sol Ring'),
      { target: { value: 'foil' } },
    )
    fireEvent.click(
      within(wantedSolRing).getByRole('button', {
        name: 'Guardar cambios',
      }),
    )

    expect(
      within(wantedSolRing).getByText('4 buscadas · Francés · Foil'),
    ).toBeVisible()
    expect(screen.getByText('La búsqueda se ha actualizado.')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Publicar carta' }))
    fireEvent.change(screen.getByLabelText('Carta'), {
      target: { value: 'card-esper-sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mis ofertas/ }))

    const ownedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article') as HTMLElement
    fireEvent.click(ownedListing.querySelector('summary')!)
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar cantidad de Esper Sentinel'),
      { target: { value: '3' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar idioma de Esper Sentinel'),
      { target: { value: 'fr' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar estado de Esper Sentinel'),
      { target: { value: 'good' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar acabado de Esper Sentinel'),
      { target: { value: 'foil' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar precio de Esper Sentinel'),
      { target: { value: '4.75' } },
    )
    fireEvent.click(
      within(ownedListing).getByRole('button', {
        name: 'Guardar cambios',
      }),
    )

    expect(within(ownedListing).getByText('3 · Francés')).toBeVisible()
    expect(screen.getByText('La oferta se ha actualizado.')).toBeVisible()

    const storedData = createLocalDemoRepository(window.localStorage).load()
    expect(
      storedData.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring'),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['fr'],
      acceptedFinishes: ['foil'],
    })
    expect(storedData.listings.at(-1)).toMatchObject({
      quantity: 3,
      language: 'fr',
      condition: 'good',
      finish: 'foil',
      priceEur: 4.75,
    })
  })

  it('creates, renames and filters private card lists', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))
    fireEvent.change(screen.getByLabelText('Nombre de la lista'), {
      target: { value: 'Modern 2026' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('button', { name: 'Modern 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Lista «Modern 2026» creada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .cardLists.some(({ name }) => name === 'Modern 2026'),
    ).toBe(true)

    fireEvent.click(
      screen.getByRole('button', { name: 'Renombrar Modern 2026' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre de la lista'), {
      target: { value: 'Modern competitivo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(
      screen.getByRole('button', { name: 'Modern competitivo' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pauper' }))
    expect(
      screen.getAllByRole('heading', { name: 'Cyclonic Rift' }),
    ).toHaveLength(2)
    expect(
      screen.queryByRole('heading', { name: 'Sol Ring' }),
    ).not.toBeInTheDocument()
  })

  it('opens a shareable member catalogue with filters and reservations', () => {
    window.location.hash =
      '#cartas?member=member-marta&set=2X2&lang=es&condition=mint'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Marta Soler' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Edición')).toHaveValue('2X2')
    expect(screen.getByLabelText('Idioma de la página compartida')).toHaveValue(
      'es',
    )
    expect(screen.getByLabelText('Estado de la página compartida')).toHaveValue(
      'mint',
    )

    fireEvent.change(screen.getByLabelText('Edición'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Idioma de la página compartida'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Estado de la página compartida'), {
      target: { value: '' },
    })

    const reserveButton = screen.getAllByRole('button', { name: 'Reservar' })[0]
    const reservedCard = reserveButton.closest('article')
    expect(
      within(reservedCard as HTMLElement).getByText('Cantidad'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('2'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('2.50 €'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('Inglés'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('Excellent'),
    ).toBeInTheDocument()
    fireEvent.click(reserveButton)

    const memberOfferDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(memberOfferDialog).getByText('Disponibles'),
    ).toBeInTheDocument()
    fireEvent.change(
      within(memberOfferDialog).getByLabelText('Cantidad a reservar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Reservar 2 cartas',
      }),
    )

    expect(
      within(memberOfferDialog).getByText('2 cartas reservadas para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(
          ({ reservedByMemberId }) =>
            reservedByMemberId === demoData.currentMemberId,
        ),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 2 })

    fireEvent.change(
      within(memberOfferDialog).getByLabelText('Cantidad a cancelar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Cancelar 2 cartas',
      }),
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    expect(
      within(reservedCard as HTMLElement).getByRole('button', {
        name: 'Reservar',
      }),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({ status: 'available' })
    expect(
      screen.getByText(/La reserva de .+ se ha cancelado/),
    ).toBeInTheDocument()
  })

  it('lists cards reserved by the current member', () => {
    window.location.hash = '#cartas?member=member-marta'
    render(<App />)

    const reservedCard = screen
      .getAllByRole('button', { name: 'Reservar' })[0]
      .closest('article')
    const cardName = within(reservedCard as HTMLElement).getByRole(
      'heading',
    ).textContent
    fireEvent.click(
      within(reservedCard as HTMLElement).getByRole('button', {
        name: 'Reservar',
      }),
    )
    const memberOfferDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las cartas' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reservadas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas reservadas' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: cardName ?? '' }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/De Marta Soler/)).toBeInTheDocument()
    expect(screen.getByText('Para ti')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    const cancellationDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    expect(
      within(cancellationDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeDisabled()
    fireEvent.click(
      within(cancellationDialog).getByRole('button', {
        name: 'Cancelar 1 carta',
      }),
    )
    fireEvent.click(
      within(cancellationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByText('No tienes ninguna carta reservada pendiente.'),
    ).toBeInTheDocument()
    expect(screen.getByText('La reserva se ha cancelado.')).toBeInTheDocument()
  })

  it('lets the seller partially release a reserved quantity', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    repository.save(
      reserveMarketplaceListing(
        structuredClone(demoData),
        'listing-marketplace-demo-14',
        'member-marta',
        undefined,
        2,
      ),
    )
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reservadas/ }))

    const releaseButton = screen.getByRole('button', {
      name: 'Liberar carta',
    })
    expect(
      within(releaseButton.closest('article') as HTMLElement).getByText(
        'Tu oferta',
      ),
    ).toBeInTheDocument()
    fireEvent.click(releaseButton)

    const releaseDialog = screen.getByRole('dialog')
    expect(
      within(releaseDialog).getByLabelText('Cantidad a liberar'),
    ).toHaveValue('1')
    expect(
      within(releaseDialog).getByLabelText('Cantidad a liberar'),
    ).not.toBeDisabled()
    fireEvent.click(
      within(releaseDialog).getByRole('button', {
        name: 'Liberar 1 carta',
      }),
    )

    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-marketplace-demo-14'),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 1 })
  })

  it('filters wanted cards without a private list', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.wantedCards[0].cardListId = undefined
    repository.save(modifiedData)

    render(<App />)
    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Sin lista' }))

    expect(screen.getByRole('button', { name: 'Sin lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'The One Ring' }),
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
