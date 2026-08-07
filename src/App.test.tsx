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

  it('opens the latest community event standings', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(
      screen.getByRole('heading', { name: 'Clasificaciones' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'MTG · Pauper' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Últimos eventos' }))

    expect(
      screen.getByRole('heading', { name: 'Win a Box Pauper' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Carla Pons')).toBeInTheDocument()
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

    fireEvent.click(
      screen.getByRole('button', {
        name: /FNM Pauper.*24 de julio de 2026/,
      }),
    )

    expect(screen.getByText('16 participantes')).toBeInTheDocument()
    expect(screen.getByText('Sergio Gil')).toBeInTheDocument()
  })

  it('filters the cumulative community ranking', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(screen.getByRole('tab', { name: 'Comunidad' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByRole('heading', {
        name: 'MTG · Pauper · Todos los eventos',
      }),
    ).toBeInTheDocument()

    const rankingTable = screen.getByRole('table', {
      name: 'Clasificación acumulada',
    })
    expect(
      within(rankingTable).getByRole('row', {
        name: /1 Carla Pons 6 2 5 47pts/,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tipo de evento'), {
      target: { value: 'event-kind-fnm' },
    })

    expect(
      screen.getByRole('heading', { name: 'MTG · Pauper · FNM' }),
    ).toBeInTheDocument()
    expect(
      within(rankingTable).getByRole('row', {
        name: /1 Sergio Gil 5 2 5 38pts/,
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Top 20' }))
    expect(screen.getByRole('button', { name: 'Top 20' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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
      screen.getByRole('heading', { name: 'Hola, Lucía' }),
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
      within(publishedNews as HTMLElement).getByText(/Lucía Martín/),
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
      screen.getByRole('heading', { name: 'Liga One Piece' }),
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
        name: 'Ver detalles',
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

    expect(screen.queryByText('Álex Romero')).not.toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .registrations.find(({ id }) => id === 'registration-alex-commander')
        ?.status,
    ).toBe('cancelled')
  })

  it('browses marketplace offers and the member wanted list', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Diego Sánchez')).toBeInTheDocument()

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: 'Sheoldred' } },
    )

    expect(
      screen.getByRole('heading', { name: 'Sheoldred, the Apocalypse' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Sol Ring' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas buscadas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'The One Ring' }),
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
    const publishedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article')
    expect(
      within(publishedListing as HTMLElement).getByText('Álex Romero'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1),
    ).toMatchObject({
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      quantity: 2,
    })
  })

  it('imports a wanted-card list and reports unknown names', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Una carta por línea'), {
      target: {
        value: '2x Rhystic Study\nEsper Sentinel\nCarta desconocida',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Importar búsquedas' }))

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
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .wantedCards.filter(
          ({ memberId }) => memberId === demoData.currentMemberId,
        ),
    ).toHaveLength(4)
  })

  it('creates and displays automatic matches after an import', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Tus coincidencias' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 encontradas')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Una carta por línea'), {
      target: { value: 'Rhystic Study' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Importar búsquedas' }))
    fireEvent.click(screen.getByRole('button', { name: /Coincidencias/ }))

    expect(screen.getByText('3 encontradas')).toBeInTheDocument()
    const newMatch = screen
      .getByRole('heading', { name: 'Rhystic Study' })
      .closest('article')
    expect(
      within(newMatch as HTMLElement).getByText('Marta Soler'),
    ).toBeInTheDocument()
    expect(
      within(newMatch as HTMLElement).getByText('Nueva'),
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
        name: 'Ver coincidencia',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Diego Sánchez' }),
    ).toBeInTheDocument()
    expect(screen.getByText('diego-modern')).toBeInTheDocument()
    expect(
      screen.getByText(/solo se muestran porque existe una coincidencia/),
    ).toBeInTheDocument()
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

  it('records a completed trade from its match detail', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    const solRingMatch = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    fireEvent.click(
      within(solRingMatch as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Marcar intercambio realizado',
      }),
    )

    expect(screen.getByText('Operación registrada')).toBeInTheDocument()
    expect(
      screen.getByText('Intercambio realizado con Diego Sánchez.'),
    ).toBeInTheDocument()

    const storedData = createLocalDemoRepository(window.localStorage).load()
    expect(storedData.cardDeals).toEqual([
      expect.objectContaining({
        matchId: 'match-alex-sol-ring',
        type: 'trade',
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
      .getByRole('heading', { name: 'Sol Ring' })
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
