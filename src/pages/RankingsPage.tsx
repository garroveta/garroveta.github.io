import {
  CalendarDays,
  ChevronRight,
  Medal,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  getCommunityPoints,
  getLatestEventStandings,
  type ResolvedEventStanding,
} from '../data/rankingSelectors'
import type { DemoDataSet } from '../domain/types'

type RankingsPageProps = {
  data: DemoDataSet
}

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

export function RankingsPage({ data }: RankingsPageProps) {
  const standings = useMemo(() => getLatestEventStandings(data), [data])
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

      {selectedStanding ? <EventRankingDetail item={selectedStanding} /> : null}

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
