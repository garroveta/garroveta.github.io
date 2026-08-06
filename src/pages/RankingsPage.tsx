import {
  CalendarDays,
  ChevronRight,
  Crown,
  ListOrdered,
  Medal,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  getCommunityLeaderboard,
  getCommunityPoints,
  getLatestEventStandings,
  type CommunityRankingPlayer,
  type RankingFilters,
  type ResolvedEventStanding,
} from '../data/rankingSelectors'
import type { DemoDataSet } from '../domain/types'

type RankingsPageProps = {
  data: DemoDataSet
}

type RankingView = 'community' | 'events'

const eventDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

function EventRankingCard({
  item,
  selected,
  onSelect,
}: {
  item: ResolvedEventStanding
  selected: boolean
  onSelect: () => void
}) {
  const isPauper = item.format.id === 'format-mtg-pauper'

  return (
    <button
      className={`result-card${selected ? ' result-card--selected' : ''}${isPauper ? ' result-card--pauper' : ''}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="result-card__eyebrow">
        {item.game.shortName} · {item.format.shortName}
      </span>
      <strong>{item.event.title}</strong>
      <span className="result-card__meta">
        {eventDateFormatter.format(new Date(item.event.endsAt))} ·{' '}
        {item.standing.entries.length} jugadores
      </span>
      <span className="result-card__action">
        Ver clasificación
        <ChevronRight aria-hidden="true" size={16} />
      </span>
    </button>
  )
}

function EventRankingDetail({ item }: { item: ResolvedEventStanding }) {
  return (
    <section
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
            <span>{item.eventKind.shortName}</span>
          </div>
        </div>
        <div className="event-ranking-detail__summary">
          <span>
            <CalendarDays aria-hidden="true" size={16} />
            {eventDateFormatter.format(new Date(item.event.endsAt))}
          </span>
          <span>
            <UsersRound aria-hidden="true" size={16} />
            {item.standing.entries.length} participantes
          </span>
        </div>
      </header>

      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Jugador</th>
              <th scope="col">Puntos</th>
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
                  <strong>{getCommunityPoints(entry.rank)}</strong>
                  <span className="ranking-points-label"> pts</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ranking-table-note">
        Estos puntos se suman al ranking de la comunidad cuando el jugador está
        vinculado a un perfil Garroveta.
      </p>
    </section>
  )
}

function TopPlayerCard({ player }: { player: CommunityRankingPlayer }) {
  return (
    <article className={`top-player-card top-player-card--${player.rank}`}>
      <span className="top-player-card__rank">
        {player.rank === 1 ? <Crown aria-hidden="true" size={16} /> : null}#
        {player.rank}
      </span>
      <span className="top-player-card__avatar">{player.member.initials}</span>
      <div>
        <h3>{player.member.displayName}</h3>
        <p>
          {player.eventsPlayed} eventos · {player.podiums} podios
        </p>
      </div>
      <strong>{player.points} pts</strong>
    </article>
  )
}

function CommunityRanking({ data }: { data: DemoDataSet }) {
  const [gameId, setGameId] = useState('game-mtg')
  const [formatId, setFormatId] = useState('format-mtg-pauper')
  const [eventKindId, setEventKindId] = useState('')
  const [months, setMonths] = useState<RankingFilters['months']>(6)
  const [limit, setLimit] = useState<10 | 20>(10)
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
    selectedEventKind?.shortName ?? 'Todos los eventos',
  ]
    .filter(Boolean)
    .join(' · ')

  const changeGame = (nextGameId: string) => {
    setGameId(nextGameId)
    setFormatId(nextGameId === 'game-mtg' ? 'format-mtg-pauper' : '')
    setEventKindId('')
  }

  return (
    <section
      className="community-ranking"
      aria-labelledby="community-ranking-title"
    >
      <div className="ranking-filter-panel">
        <div className="ranking-filter-panel__heading">
          <div>
            <span>Personaliza el ranking</span>
            <h2>Filtros</h2>
          </div>
          <span className="ranking-period-summary">Últimos {months} meses</span>
        </div>

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
            <span>Tipo de evento</span>
            <select
              value={eventKindId}
              onChange={(event) => setEventKindId(event.target.value)}
            >
              <option value="">Todos los eventos</option>
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
            <div className="ranking-segmented" aria-label="Periodo del ranking">
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
            <div className="ranking-segmented" aria-label="Tamaño del ranking">
              {([10, 20] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={limit === size}
                  onClick={() => setLimit(size)}
                >
                  Top {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="community-ranking__heading">
        <div>
          <span>Clasificación acumulada</span>
          <h2 id="community-ranking-title">{rankingTitle}</h2>
        </div>
        <p>{ranking.length} jugadores clasificados</p>
      </div>

      {ranking.length > 0 ? (
        <>
          <div className="top-five" aria-label="Top 5 de la comunidad">
            {ranking.slice(0, 5).map((player) => (
              <TopPlayerCard key={player.member.id} player={player} />
            ))}
          </div>

          <div className="ranking-table-wrap cumulative-ranking-table-wrap">
            <table
              className="ranking-table cumulative-ranking-table"
              aria-label="Clasificación acumulada"
            >
              <thead>
                <tr>
                  <th scope="col">Pos.</th>
                  <th scope="col">Jugador</th>
                  <th scope="col">Eventos</th>
                  <th scope="col">Victorias</th>
                  <th scope="col">Podios</th>
                  <th scope="col">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, limit).map((player) => (
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
                      <strong>{player.points}</strong>
                      <span className="ranking-points-label"> pts</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export function RankingsPage({ data }: RankingsPageProps) {
  const standings = useMemo(() => getLatestEventStandings(data), [data])
  const [activeView, setActiveView] = useState<RankingView>('community')
  const [selectedStandingId, setSelectedStandingId] = useState(
    standings[0]?.standing.id ?? '',
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

      <section
        className="pauper-highlight"
        aria-labelledby="pauper-highlight-title"
      >
        <span className="pauper-highlight__icon">
          <Sparkles aria-hidden="true" size={22} />
        </span>
        <div>
          <span>El formato más activo</span>
          <h2 id="pauper-highlight-title">MTG · Pauper</h2>
          <p>
            FNM casi cada viernes y un torneo Win a Box durante el fin de
            semana.
          </p>
        </div>
        <span className="pauper-highlight__trophy">
          <Trophy aria-hidden="true" size={22} />
          Ranking activo
        </span>
      </section>

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
            <EventRankingDetail item={selectedStanding} />
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
                  onSelect={() => setSelectedStandingId(item.standing.id)}
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
            Cada resultado atribuye entre 10 puntos para el primer puesto y 1
            punto de participación. El sistema podrá evolucionar con la prueba
            piloto.
          </p>
        </div>
      </aside>
    </div>
  )
}
