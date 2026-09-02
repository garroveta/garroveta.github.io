import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ListOrdered,
  Medal,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMemo, useRef, useState, type RefObject } from 'react'

import {
  getCommunityLeaderboard,
  getLatestEventStandings,
  type RankingFilters,
  type ResolvedEventStanding,
} from '../data/rankingSelectors'
import { getCommunityPoints } from '../data/rankingSettings'
import type {
  CommunityRankingSettings,
  DemoDataSet,
  EventStandingEntry,
} from '../domain/types'

type RankingView = 'community' | 'events'

type RankingsPageProps = {
  data: DemoDataSet
  initialView?: RankingView
  initialStandingId?: string
}

const eventDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

function formatPercentage(value: number) {
  return `${value.toFixed(1)} %`
}

function EventRankingCard({
  item,
  selected,
  onSelect,
}: {
  item: ResolvedEventStanding
  selected: boolean
  onSelect: () => void
}) {
  const isStandard = item.format.id === 'format-mtg-standard'

  return (
    <button
      className={`result-card${selected ? ' result-card--selected' : ''}${isStandard ? ' result-card--standard' : ''}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="result-card__eyebrow">
        {item.game.shortName} · {item.format.shortName}
      </span>
      <strong>{item.event.title}</strong>
      <span className="result-card__meta">
        {eventDateFormatter.format(
          new Date(item.event.endsAt ?? item.event.startsAt),
        )}{' '}
        · {item.standing.entries.length} jugadores
      </span>
      <span className="result-card__action">
        Ver clasificación
        <ChevronRight aria-hidden="true" size={16} />
      </span>
    </button>
  )
}

function MobileEventStandingList({
  entries,
  eventTitle,
  rankingSettings,
}: {
  entries: EventStandingEntry[]
  eventTitle: string
  rankingSettings: CommunityRankingSettings
}) {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    () => new Set(),
  )
  const allExpanded =
    entries.length > 0 &&
    entries.every((_, index) => expandedEntries.has(index))

  const toggleEntry = (index: number) => {
    setExpandedEntries((current) => {
      const next = new Set(current)

      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }

      return next
    })
  }

  const toggleAll = () => {
    setExpandedEntries(
      allExpanded ? new Set() : new Set(entries.map((_, index) => index)),
    )
  }

  return (
    <section
      className="mobile-standing"
      aria-label={`Clasificación móvil de ${eventTitle}`}
    >
      <div className="mobile-standing__toolbar">
        <span>Clasificación</span>
        <button type="button" onClick={toggleAll}>
          {allExpanded ? 'Ocultar desempates' : 'Mostrar todos los desempates'}
        </button>
      </div>

      <ol className="mobile-standing__list">
        {entries.map((entry, index) => {
          const isExpanded = expandedEntries.has(index)
          const detailsId = `mobile-tiebreakers-${index}`

          return (
            <li
              className={`mobile-standing-card mobile-standing-card--${entry.rank}`}
              key={`${entry.rank}-${entry.displayName}-${index}`}
            >
              <div className="mobile-standing-card__main">
                <span
                  className={`ranking-position ranking-position--${entry.rank}`}
                  aria-label={`Posición ${entry.rank}`}
                >
                  {entry.rank}
                </span>
                <div className="mobile-standing-card__identity">
                  <strong>{entry.displayName}</strong>
                  {!entry.memberId ? (
                    <span className="ranking-guest">
                      <UserRound aria-hidden="true" size={12} />
                      Invitado
                    </span>
                  ) : null}
                </div>
                {entry.memberId ? (
                  <span
                    className="mobile-standing-point mobile-standing-point--community"
                    aria-label={`Más ${getCommunityPoints(entry.rank, rankingSettings)} puntos comunidad`}
                  >
                    <strong>
                      +{getCommunityPoints(entry.rank, rankingSettings)}
                    </strong>
                  </span>
                ) : (
                  <span
                    className="mobile-standing-point mobile-standing-point--guest"
                    aria-label="Sin puntos comunidad: jugador no vinculado"
                  >
                    <strong>—</strong>
                  </span>
                )}
              </div>

              <div className="mobile-standing-card__summary">
                <span
                  className="mobile-standing-event-points"
                  aria-label={`${entry.eventPoints} puntos del evento`}
                >
                  <strong>{entry.eventPoints}</strong> pts
                </span>
                <span
                  className="mobile-standing-record"
                  aria-label={`${entry.wins} victorias, ${entry.losses} derrotas y ${entry.draws} empates`}
                >
                  <strong>{entry.wins}V</strong>
                  <span aria-hidden="true"> · </span>
                  <strong>{entry.losses}D</strong>
                  <span aria-hidden="true"> · </span>
                  <strong>{entry.draws}E</strong>
                </span>
                <button
                  type="button"
                  aria-label={`${isExpanded ? 'Ocultar' : 'Desempates'} de ${entry.displayName}`}
                  aria-controls={detailsId}
                  aria-expanded={isExpanded}
                  onClick={() => toggleEntry(index)}
                >
                  {isExpanded ? 'Ocultar' : 'Desempates'}
                  <ChevronDown aria-hidden="true" size={15} />
                </button>
              </div>

              {isExpanded ? (
                <div
                  className="mobile-standing-card__tiebreakers"
                  id={detailsId}
                >
                  <span>
                    <abbr title="Porcentaje de victorias de los oponentes">
                      %VPO
                    </abbr>
                    <strong>
                      {formatPercentage(entry.opponentMatchWinPercentage)}
                    </strong>
                  </span>
                  <span>
                    <abbr title="Porcentaje de juegos ganados">%JG</abbr>
                    <strong>{formatPercentage(entry.gameWinPercentage)}</strong>
                  </span>
                  <span>
                    <abbr title="Porcentaje de juegos ganados por los oponentes">
                      %JGO
                    </abbr>
                    <strong>
                      {formatPercentage(entry.opponentGameWinPercentage)}
                    </strong>
                  </span>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function EventRankingDetail({
  item,
  rankingSettings,
  sectionRef,
}: {
  item: ResolvedEventStanding
  rankingSettings: CommunityRankingSettings
  sectionRef: RefObject<HTMLElement | null>
}) {
  return (
    <section
      ref={sectionRef}
      className="event-ranking-detail"
      aria-labelledby="event-ranking-title"
    >
      <header className="event-ranking-detail__header">
        <div>
          <span className="ranking-kicker">Clasificación final</span>
          <h2 id="event-ranking-title">{item.event.title}</h2>
          <div className="ranking-context">
            <span>{item.game.shortName}</span>
            <span>{item.format.shortName}</span>
            {item.eventKind ? <span>{item.eventKind.shortName}</span> : null}
          </div>
        </div>
        <div className="event-ranking-detail__summary">
          <span>
            <CalendarDays aria-hidden="true" size={16} />
            {eventDateFormatter.format(
              new Date(item.event.endsAt ?? item.event.startsAt),
            )}
          </span>
          <span>
            <UsersRound aria-hidden="true" size={16} />
            {item.standing.entries.length} participantes
          </span>
        </div>
      </header>

      <MobileEventStandingList
        key={item.standing.id}
        entries={item.standing.entries}
        eventTitle={item.event.title}
        rankingSettings={rankingSettings}
      />

      <div className="ranking-table-wrap event-standing-desktop">
        <table
          className="ranking-table event-standing-table"
          aria-label={`Clasificación de ${item.event.title}`}
        >
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Jugador</th>
              <th scope="col">Pts evento</th>
              <th scope="col">
                <abbr
                  aria-label="Victorias / derrotas / empates"
                  title="Victorias / derrotas / empates"
                >
                  V/D/E
                </abbr>
              </th>
              <th scope="col">
                <abbr
                  aria-label="Porcentaje de victorias de los oponentes"
                  title="Porcentaje de victorias de los oponentes"
                >
                  %VPO
                </abbr>
              </th>
              <th scope="col">
                <abbr
                  aria-label="Porcentaje de juegos ganados"
                  title="Porcentaje de juegos ganados"
                >
                  %JG
                </abbr>
              </th>
              <th scope="col">
                <abbr
                  aria-label="Porcentaje de juegos ganados por los oponentes"
                  title="Porcentaje de juegos ganados por los oponentes"
                >
                  %JGO
                </abbr>
              </th>
              <th scope="col">Pts comunidad</th>
            </tr>
          </thead>
          <tbody>
            {item.standing.entries.map((entry, index) => (
              <tr key={`${entry.rank}-${entry.displayName}-${index}`}>
                <td>
                  <span
                    className={`ranking-position ranking-position--${entry.rank}`}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td>
                  <span className="ranking-player-name">
                    {entry.displayName}
                  </span>
                  {!entry.memberId ? (
                    <span className="ranking-guest">
                      <UserRound aria-hidden="true" size={12} />
                      Invitado
                    </span>
                  ) : null}
                </td>
                <td>
                  <strong className="event-points-value">
                    {entry.eventPoints}
                  </strong>
                </td>
                <td className="ranking-record">
                  {entry.wins}/{entry.losses}/{entry.draws}
                </td>
                <td>{formatPercentage(entry.opponentMatchWinPercentage)}</td>
                <td>{formatPercentage(entry.gameWinPercentage)}</td>
                <td>{formatPercentage(entry.opponentGameWinPercentage)}</td>
                <td>
                  {entry.memberId ? (
                    <strong className="community-points-value">
                      +{getCommunityPoints(entry.rank, rankingSettings)}
                    </strong>
                  ) : (
                    <strong
                      className="community-points-value community-points-value--guest"
                      aria-label="Sin puntos comunidad: jugador no vinculado"
                    >
                      —
                    </strong>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ranking-table-note">
        V/D/E significa victorias, derrotas y empates. Los puntos del evento y
        sus porcentajes conservan las estadísticas del torneo; solo los puntos
        comunidad se suman al ranking Garroveta de los miembros vinculados.
      </p>
    </section>
  )
}

function CommunityRanking({ data }: { data: DemoDataSet }) {
  const [gameId, setGameId] = useState('game-mtg')
  const [formatId, setFormatId] = useState('')
  const [eventKindId, setEventKindId] = useState('')
  const [months, setMonths] = useState<RankingFilters['months']>(
    data.rankingSettings.defaultPeriodMonths,
  )
  const [limit, setLimit] = useState<10 | 'all'>(
    data.rankingSettings.defaultLimit,
  )
  const games = data.games.filter(
    ({ category }) => category !== 'role_playing_game',
  )
  const formats = data.competitionFormats.filter(
    (format) => format.gameId === gameId,
  )
  const ranking = useMemo(
    () =>
      getCommunityLeaderboard(data, {
        gameId,
        formatId: formatId || undefined,
        competitionEventKindId: eventKindId || undefined,
        months,
      }),
    [data, eventKindId, formatId, gameId, months],
  )
  const selectedGame = data.games.find(({ id }) => id === gameId)
  const selectedFormat = data.competitionFormats.find(
    ({ id }) => id === formatId,
  )
  const selectedEventKind = data.competitionEventKinds.find(
    ({ id }) => id === eventKindId,
  )
  const rankingTitle = [
    selectedGame?.shortName,
    selectedFormat?.shortName ?? 'Todos los formatos',
    selectedEventKind?.shortName ?? 'Todas las series',
  ]
    .filter(Boolean)
    .join(' · ')

  const changeGame = (nextGameId: string) => {
    setGameId(nextGameId)
    setFormatId('')
    setEventKindId('')
  }

  return (
    <section
      className="community-ranking"
      aria-labelledby="community-ranking-title"
    >
      <details className="ranking-filter-panel">
        <summary>
          <span className="ranking-filter-summary__title">Filtros</span>
          <span className="ranking-filter-summary__value">
            {selectedGame?.shortName} ·{' '}
            {selectedFormat?.shortName ?? 'Todos los formatos'} ·{' '}
            {selectedEventKind?.shortName ?? 'Todas las series'} · {months}{' '}
            meses · {limit === 'all' ? 'Todos' : `Top ${limit}`}
          </span>
          <span className="ranking-filter-summary__action">
            Modificar
            <ChevronDown aria-hidden="true" size={16} />
          </span>
        </summary>

        <div className="ranking-filter-panel__content">
          <div className="ranking-select-grid">
            <label className="form-field">
              <span>Juego</span>
              <select
                value={gameId}
                onChange={(event) => changeGame(event.target.value)}
              >
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Formato</span>
              <select
                value={formatId}
                onChange={(event) => setFormatId(event.target.value)}
              >
                <option value="">Todos los formatos</option>
                {formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Serie</span>
              <select
                value={eventKindId}
                onChange={(event) => setEventKindId(event.target.value)}
              >
                <option value="">Todas las series</option>
                {data.competitionEventKinds.map((eventKind) => (
                  <option key={eventKind.id} value={eventKind.id}>
                    {eventKind.shortName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ranking-choice-row">
            <div>
              <span>Periodo</span>
              <div
                className="ranking-segmented"
                aria-label="Periodo del ranking"
              >
                {([3, 6, 12] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={months === period}
                    onClick={() => setMonths(period)}
                  >
                    {period} meses
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>Clasificación</span>
              <div
                className="ranking-segmented"
                aria-label="Número de jugadores mostrados"
              >
                <button
                  type="button"
                  aria-pressed={limit === 10}
                  onClick={() => setLimit(10)}
                >
                  Top 10
                </button>
                <button
                  type="button"
                  aria-pressed={limit === 'all'}
                  onClick={() => setLimit('all')}
                >
                  Todos
                </button>
              </div>
            </div>
          </div>
        </div>
      </details>

      <div className="community-ranking__heading">
        <div>
          <span>Clasificación acumulada</span>
          <h2 id="community-ranking-title">{rankingTitle}</h2>
        </div>
        <p>{ranking.length} jugadores clasificados</p>
      </div>

      {ranking.length > 0 ? (
        <>
          <div className="ranking-table-wrap cumulative-ranking-table-wrap">
            <table
              className="ranking-table cumulative-ranking-table"
              aria-label="Clasificación acumulada"
            >
              <thead>
                <tr>
                  <th scope="col">Pos.</th>
                  <th scope="col">Jugador</th>
                  <th scope="col" aria-label="Eventos">
                    <span
                      className="ranking-column-label--full"
                      aria-hidden="true"
                    >
                      Eventos
                    </span>
                    <abbr
                      className="ranking-column-label--short"
                      title="Eventos"
                      aria-hidden="true"
                    >
                      Ev.
                    </abbr>
                  </th>
                  <th scope="col" aria-label="Victorias">
                    <span
                      className="ranking-column-label--full"
                      aria-hidden="true"
                    >
                      Victorias
                    </span>
                    <abbr
                      className="ranking-column-label--short"
                      title="Victorias"
                      aria-hidden="true"
                    >
                      Vict.
                    </abbr>
                  </th>
                  <th scope="col" aria-label="Podios">
                    <span
                      className="ranking-column-label--full"
                      aria-hidden="true"
                    >
                      Podios
                    </span>
                    <abbr
                      className="ranking-column-label--short"
                      title="Podios"
                      aria-hidden="true"
                    >
                      Pod.
                    </abbr>
                  </th>
                  <th scope="col" aria-label="Puntos comunidad">
                    <span
                      className="ranking-column-label--full"
                      aria-hidden="true"
                    >
                      Puntos comunidad
                    </span>
                    <abbr
                      className="ranking-column-label--short"
                      title="Puntos comunidad"
                      aria-hidden="true"
                    >
                      Pts
                    </abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking
                  .slice(0, limit === 'all' ? undefined : limit)
                  .map((player) => (
                    <tr key={player.member.id}>
                      <td>
                        <span
                          className={`ranking-position ranking-position--${player.rank}`}
                        >
                          {player.rank}
                        </span>
                      </td>
                      <td>
                        <span className="ranking-player-name">
                          {player.member.displayName}
                        </span>
                      </td>
                      <td>{player.eventsPlayed}</td>
                      <td>{player.eventWins}</td>
                      <td>{player.podiums}</td>
                      <td>
                        <strong
                          aria-label={`${player.points} puntos comunidad`}
                        >
                          {player.points}
                        </strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div
            className="cumulative-ranking-legend"
            role="note"
            aria-label="Leyenda del ranking comunitario"
          >
            <span>
              <abbr title="Eventos">Ev.</abbr> eventos
            </span>
            <span>
              <abbr title="Victorias">Vict.</abbr> victorias
            </span>
            <span>
              <abbr title="Podios">Pod.</abbr> podios
            </span>
            <span>
              <abbr title="Puntos comunidad">Pts</abbr> puntos comunidad
            </span>
          </div>
          {ranking.length > 10 ? (
            <div className="cumulative-ranking-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setLimit(limit === 'all' ? 10 : 'all')}
              >
                {limit === 'all' ? 'Mostrar Top 10' : 'Mostrar todos'}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="ranking-empty-state">
          <ListOrdered aria-hidden="true" size={28} />
          <h3>Aún no hay resultados con estos filtros.</h3>
          <p>Prueba otro formato, tipo de evento o periodo.</p>
        </div>
      )}
    </section>
  )
}

export function RankingsPage({
  data,
  initialView = 'community',
  initialStandingId,
}: RankingsPageProps) {
  const standings = useMemo(() => getLatestEventStandings(data), [data])
  const rankingDetailRef = useRef<HTMLElement>(null)
  const [activeView, setActiveView] = useState<RankingView>(initialView)
  const [selectedStandingId, setSelectedStandingId] = useState(
    initialStandingId ?? standings[0]?.standing.id ?? '',
  )
  const selectedStanding =
    standings.find(({ standing }) => standing.id === selectedStandingId) ??
    standings[0]

  return (
    <div className="page rankings-page">
      <header className="page-heading rankings-heading">
        <span className="page-eyebrow">Comunidad competitiva</span>
        <h1>Clasificaciones</h1>
        <p>
          Consulta los últimos resultados y sigue la evolución de los jugadores
          de CRC DeLorean.
        </p>
      </header>

      <div
        className="ranking-view-tabs"
        role="tablist"
        aria-label="Vistas de clasificación"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'community'}
          onClick={() => setActiveView('community')}
        >
          <Trophy aria-hidden="true" size={17} />
          Comunidad
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'events'}
          onClick={() => setActiveView('events')}
        >
          <CalendarDays aria-hidden="true" size={17} />
          Últimos eventos
        </button>
      </div>

      {activeView === 'community' ? (
        <CommunityRanking data={data} />
      ) : (
        <>
          {selectedStanding ? (
            <EventRankingDetail
              item={selectedStanding}
              rankingSettings={data.rankingSettings}
              sectionRef={rankingDetailRef}
            />
          ) : null}

          <section
            className="latest-results"
            aria-labelledby="latest-results-title"
          >
            <div className="section-heading">
              <div>
                <span>Historial</span>
                <h2 id="latest-results-title">Últimos resultados</h2>
              </div>
              <p>{standings.length} clasificaciones</p>
            </div>

            <div className="result-card-grid">
              {standings.map((item) => (
                <EventRankingCard
                  key={item.standing.id}
                  item={item}
                  selected={item.standing.id === selectedStanding?.standing.id}
                  onSelect={() => {
                    setSelectedStandingId(item.standing.id)
                    rankingDetailRef.current?.scrollIntoView({
                      behavior: 'auto',
                      block: 'start',
                    })
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <aside className="ranking-method-note">
        <Medal aria-hidden="true" size={20} />
        <div>
          <strong>Un barómetro simple para empezar</strong>
          <p>
            Los puntos oficiales siguen visibles en cada evento. Garroveta
            atribuye por separado entre {data.rankingSettings.points.first}{' '}
            puntos al primer puesto y{' '}
            {data.rankingSettings.points.participation}{' '}
            {data.rankingSettings.points.participation === 1
              ? 'punto'
              : 'puntos'}{' '}
            de participación para construir esta clasificación comunitaria.
          </p>
        </div>
      </aside>
    </div>
  )
}
