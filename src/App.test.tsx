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

const importedEventLinkHtml = `
  <!-- saved from url=(0077)https://eventlink.wizards.com/stores/18452/events/11620006/rounds/3/standings -->
  <h1 class="event-page-header__title">Presentación: The Hobbit</h1>
  <div class="round-timer__complete">Se completó</div>
  <table>
    <thead><tr><th>Puesto</th><th>Nombre</th><th>Puntos</th><th>V/D/E</th><th>%VPO</th><th>%JG</th><th>%JGO</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Pep Peralta Isern</td><td>9</td><td>3/0/0</td><td>60.0%</td><td>100.0%</td><td>55.0%</td></tr>
      <tr><td>2</td><td>José Thomas 🔴⚪</td><td>6</td><td>2/1/0</td><td>55.0%</td><td>66.7%</td><td>50.0%</td></tr>
    </tbody>
  </table>
`

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
      screen.getByRole('heading', { name: 'FNM Standard' }),
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
      screen.getByRole('heading', { name: 'Win a Box Standard' }),
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
      name: 'Clasificación móvil de Win a Box Standard',
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
        name: /FNM Standard.*24 de julio de 2026/,
      }),
    )

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
    expect(screen.getByText('36 participantes')).toBeInTheDocument()
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

  it('lets the manager configure the community ranking barometer', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }))

    fireEvent.change(screen.getByLabelText('Puntos para 1.º'), {
      target: { value: '12' },
    })
    fireEvent.change(screen.getByLabelText('Periodo por defecto'), {
      target: { value: '12' },
    })
    fireEvent.change(screen.getByLabelText('Jugadores mostrados'), {
      target: { value: 'all' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    )

    expect(screen.getByText('Configuración guardada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().rankingSettings,
    ).toMatchObject({
      points: { first: 12 },
      defaultPeriodMonths: 12,
      defaultLimit: 'all',
    })

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos eventos' }))
    expect(
      screen.getAllByLabelText('Más 12 puntos comunidad'),
    ).not.toHaveLength(0)
  })

  it('lets the manager configure registration defaults for new MTG events', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Inscripciones' }))

    fireEvent.change(screen.getByLabelText('Plazas por defecto para Draft'), {
      target: { value: '4' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    )

    expect(screen.getByText('Configuración guardada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .registrationSettings.rules.find(
          ({ eventType }) => eventType === 'draft',
        ),
    ).toMatchObject({ defaultCapacity: 4, enabledByDefault: true })

    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))
    fireEvent.change(screen.getByLabelText('Tipo de actividad'), {
      target: { value: 'draft' },
    })

    expect(screen.getByLabelText('Plazas')).toHaveValue(4)
    expect(
      screen.getByRole('checkbox', { name: /^Activar inscripciones/ }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /^Activar lista de espera/ }),
    ).toBeChecked()
  })

  it('lets the manager approve members and manage their permissions', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Miembros' }))
    fireEvent.change(screen.getByLabelText('Buscar miembros'), {
      target: { value: 'Lucas Muntaner' },
    })

    const pendingMember = screen.getByText('Lucas Muntaner').closest('article')
    expect(pendingMember).toBeTruthy()
    fireEvent.click(
      within(pendingMember as HTMLElement).getByRole('button', {
        name: 'Aceptar',
      }),
    )
    const approvedMember = screen.getByText('Lucas Muntaner').closest('article')
    expect(
      within(approvedMember as HTMLElement).getByText('Jugador · Activo'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar miembros'), {
      target: { value: 'Marta Soler' },
    })
    const marta = screen.getByText('Marta Soler').closest('article')
    expect(marta).toBeTruthy()
    fireEvent.change(
      within(marta as HTMLElement).getByLabelText('Rol de Marta Soler'),
      { target: { value: 'moderator' } },
    )
    fireEvent.click(within(marta as HTMLElement).getByText(/^Etiquetas/))
    fireEvent.click(
      within(marta as HTMLElement).getByRole('checkbox', { name: 'Pauper' }),
    )
    fireEvent.click(
      within(marta as HTMLElement).getByRole('button', { name: 'Suspender' }),
    )

    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .members.find(({ id }) => id === 'member-marta'),
    ).toMatchObject({
      role: 'moderator',
      status: 'suspended',
      tagIds: expect.arrayContaining(['tag-pauper']),
    })
  })

  it('opens an event detail and returns to the agenda', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const standardCard = screen
      .getByRole('heading', { name: 'FNM Standard' })
      .closest('article')
    fireEvent.click(
      within(standardCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'FNM Standard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('CRC Delorean')).toBeInTheDocument()
    expect(screen.queryByText(/confirmadas/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Inscribirme/ }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la agenda' }))

    expect(
      screen.getByRole('heading', { name: 'Próximos eventos' }),
    ).toBeInTheDocument()
  })

  it('switches between the illustrated agenda and compact event list', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    expect(
      screen.getByRole('img', {
        name: 'Cartel de Store Championship Dragon Ball',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    expect(
      screen.getByRole('group', {
        name: 'Próximos eventos en vista de lista',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Ver FNM Standard, 31 jul a las 18:00/i,
      }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('events:view-mode')).toBe('list')
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
      screen.queryByRole('heading', { name: 'FNM Standard' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Torneo' }))

    expect(screen.getByText('1 programados')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(
      screen.getByRole('heading', { name: 'FNM Standard' }),
    ).toBeInTheDocument()
  })

  it('filters events with the compact mobile controls', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por juego' }),
      {
        target: { value: 'game-one-piece' },
      },
    )
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por actividad' }),
      { target: { value: 'tournament' } },
    )

    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 programados')).toBeInTheDocument()
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

  it('lets a manager maintain configurable community options', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))

    const optionManager = screen
      .getByRole('heading', { name: 'Configuración de la comunidad' })
      .closest('section')
    expect(optionManager).toBeTruthy()
    expect(
      within(optionManager as HTMLElement).getAllByRole('tab'),
    ).toHaveLength(4)
    fireEvent.click(
      within(optionManager as HTMLElement).getByRole('tab', {
        name: /Tipos de evento/,
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Añadir tipo de evento' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Regional Qualifier' },
    })
    fireEvent.change(screen.getByLabelText('Nombre corto'), {
      target: { value: 'RCQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    const createdOption = screen
      .getByText('Regional Qualifier')
      .closest('article')
    expect(createdOption).toBeTruthy()
    expect(
      within(createdOption as HTMLElement).getByRole('button', {
        name: 'Eliminar definitivamente Regional Qualifier',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Eliminar definitivamente Friday Night Magic',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(createdOption as HTMLElement).getByRole('button', {
        name: 'Modificar Regional Qualifier',
      }),
    )
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Regional Championship Qualifier' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    const updatedOption = screen
      .getByText('Regional Championship Qualifier')
      .closest('article')
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Desactivar Regional Championship Qualifier',
      }),
    )
    expect(
      within(updatedOption as HTMLElement).getByText('Desactivada'),
    ).toBeInTheDocument()
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Subir Regional Championship Qualifier',
      }),
    )

    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .competitionEventKinds.at(-2),
    ).toMatchObject({
      name: 'Regional Championship Qualifier',
      isActive: false,
    })

    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Eliminar definitivamente Regional Championship Qualifier',
      }),
    )
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Eliminar',
      }),
    )
    expect(screen.queryByText('Regional Championship Qualifier')).toBeNull()
  })

  it('keeps deactivated options in history but removes them from new forms', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Desactivar One Piece Card Game',
      }),
    )

    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))

    expect(
      within(screen.getByLabelText('Juego')).queryByRole('option', {
        name: 'One Piece Card Game',
      }),
    ).not.toBeInTheDocument()
  })

  it('prepares a new member registration for manager approval', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      screen.getByRole('heading', { name: 'Crear una cuenta' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Vista actual: Nuevo miembro'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nombre visible'), {
      target: { value: 'Pep Peralta Isern' },
    })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'pep@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'garroveta-demo' },
    })
    fireEvent.change(screen.getByLabelText('Repetir contraseña'), {
      target: { value: 'garroveta-demo' },
    })
    fireEvent.click(screen.getByLabelText(/Acepto las normas/))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    const sendRequest = screen.getByRole('button', {
      name: 'Enviar solicitud',
    })
    expect(sendRequest).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'MTG' }))
    expect(sendRequest).toBeEnabled()
    fireEvent.click(sendRequest)

    expect(
      screen.getByRole('heading', {
        name: 'Tu cuenta está pendiente de validación',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Tomás o un moderador/)).toBeInTheDocument()
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
      within(waitlistMetric as HTMLElement).getByText('4'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '2 coincidencias nuevas' }),
    ).not.toBeInTheDocument()
  })

  it('offers EventLink result imports only for MTG events', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))

    expect(
      screen.getByRole('button', {
        name: 'Importar resultados de FNM Standard',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Importar resultados de Store Championship Dragon Ball',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Importar resultados de FNM Standard',
      }),
    )

    const importPanel = screen.getByRole('region', { name: 'FNM Standard' })
    expect(
      within(importPanel).getByText('HTML · máximo 5 MB'),
    ).toBeInTheDocument()
  })

  it('shows an imported EventLink result and updates the community ranking', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Importar resultados de Presentación: The Hobbit',
      }),
    )

    const importPanel = screen.getByRole('region', {
      name: 'Presentación: The Hobbit',
    })
    const file = new File([importedEventLinkHtml], 'eventlink.html', {
      type: 'text/html',
    })
    Object.defineProperty(file, 'text', {
      value: async () => importedEventLinkHtml,
    })
    fireEvent.change(importPanel.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })

    expect(await within(importPanel).findByText('2/2')).toBeInTheDocument()
    fireEvent.click(
      within(importPanel).getByRole('button', {
        name: 'Importar clasificación',
      }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ver clasificación' }),
    )

    expect(
      screen.getByRole('tab', { name: 'Últimos eventos' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { name: 'Presentación: The Hobbit' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pep Peralta Isern')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('tab', { name: 'Comunidad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }))
    expect(
      within(
        screen.getByRole('table', { name: 'Clasificación acumulada' }),
      ).getByText('Pep Peralta Isern'),
    ).toBeInTheDocument()
  })

  it('registers for an available event and cancels the registration', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const draftCard = screen
      .getByRole('heading', { name: 'Draft Night MTG' })
      .closest('article')

    fireEvent.click(
      within(draftCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Inscribirme' }))

    expect(screen.getByText('Tu plaza está confirmada.')).toBeInTheDocument()
    expect(screen.getByText('7/8 confirmadas')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    )

    expect(
      screen.getByText('Tu inscripción se ha cancelado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('6/8 confirmadas')).toBeInTheDocument()
  })

  it('leaves and rejoins the waitlist of a full event', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const presentationCard = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')

    fireEvent.click(
      within(presentationCard as HTMLElement).getByRole('button', {
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

  it('filters all news with the compact mobile selector', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Filtrar publicaciones por etiqueta',
      }),
      { target: { value: 'tag-commander' } },
    )

    expect(
      screen.getByRole('heading', { name: 'Nuevas mesas para Commander' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Reposición de sobres y accesorios',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Restablecer' }),
    ).toBeInTheDocument()
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
      registrationEnabled: false,
      capacity: 0,
      tagIds: ['tag-principiantes'],
    })
  })

  it('lets a manager record attendance and release a participant place', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const draftCard = screen
      .getByRole('heading', { name: 'Draft express MTG' })
      .closest('article')
    fireEvent.click(
      within(draftCard as HTMLElement).getByRole('button', {
        name: /Inscripciones/,
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Participantes' }),
    ).toBeInTheDocument()
    const sergioParticipant = screen.getByText('Sergio Gil').closest('article')
    fireEvent.click(
      within(sergioParticipant as HTMLElement).getByRole('button', {
        name: 'Registrar asistencia',
      }),
    )

    expect(
      within(sergioParticipant as HTMLElement).getByText('Presente'),
    ).toBeInTheDocument()
    expect(
      within(sergioParticipant as HTMLElement).getByRole('button', {
        name: 'Anular asistencia',
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      within(sergioParticipant as HTMLElement).getByRole('button', {
        name: 'Liberar plaza',
      }),
    )

    expect(sergioParticipant).not.toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .registrations.find(
          ({ id }) => id === 'registration-sergio-draft-express',
        )?.status,
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
      target: { value: 'member-biel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    expect(screen.getByText('Biel Ferrer')).toBeInTheDocument()

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
    const hideOwnListings = screen.getByRole('checkbox', {
      name: 'Ocultar mis cartas',
    })
    expect(hideOwnListings).toBeChecked()
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('21–40 de 149')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: 'Álex Romero' } },
    )
    expect(screen.getByText('0 resultados')).toBeInTheDocument()
    fireEvent.click(hideOwnListings)
    expect(hideOwnListings).not.toBeChecked()
    expect(screen.getByText('10 resultados')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Ver cartas de Álex Romero/ }),
    ).not.toHaveLength(0)
    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: '' } },
    )

    fireEvent.click(
      within(
        screen.getByRole('table', {
          name: 'Ofertas de cartas disponibles',
        }),
      ).getAllByRole('button', {
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
    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
    fireEvent.change(screen.getByLabelText('Cantidad'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    expect(
      screen.getByText('La carta se ha añadido a tus listas.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('row', { name: /Esper Sentinel/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Ocultar mis cartas' }),
    )
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
    expect(screen.getByText('1–12 de 149')).toBeInTheDocument()

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
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()
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
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()

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
      within(importedSolRing as HTMLElement).getByText('3 unidades · Francés'),
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
        name: 'Retirar búsqueda de Sol Ring',
      }),
    )
    expect(
      within(wantedSolRing as HTMLElement).getByText('Retirada'),
    ).toBeInTheDocument()
    expect(screen.getByText('La búsqueda se ha retirado.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mis ofertas/ }))

    const ownedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article')
    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Retirar oferta de Esper Sentinel',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Retirada'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1)
        ?.status,
    ).toBe('completed')

    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Volver a publicar Esper Sentinel',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Publicada'),
    ).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
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

    expect(within(ownedListing).getByText('3 unidades · Francés')).toBeVisible()
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

    fireEvent.click(screen.getByRole('button', { name: 'Imágenes' }))
    expect(
      screen.getByLabelText('Galería de cartas de Marta Soler'),
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: /^Reservar .+ de Marta Soler$/ })[0]
        .querySelector('svg'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))

    const reservedCard = screen.getByRole('row', {
      name: 'Abrir oferta de Sol Ring de Marta Soler',
    })
    expect(
      screen.getByRole('columnheader', { name: 'Cant.' }),
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
    fireEvent.click(reservedCard)

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
    expect(reservedCard).toBeInTheDocument()
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

    const reservedCard = screen.getByRole('row', {
      name: 'Abrir oferta de Sol Ring de Marta Soler',
    })
    const cardName = reservedCard?.querySelector('strong')?.textContent
    fireEvent.click(reservedCard)
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
    fireEvent.click(reservedCard)
    const reopenedMemberOfferDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    expect(
      within(reopenedMemberOfferDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeInTheDocument()
    fireEvent.click(
      within(reopenedMemberOfferDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
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
