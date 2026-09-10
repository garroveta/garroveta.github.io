import { Flame, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import type { MemberSeasonSummary } from '../data/rankingMemberSeason'
import {
  formatPlacement,
  formatRankDelta,
  formatSeasonProjection,
} from '../data/rankingMemberSeasonPresentation'

const VISIBLE_RESULTS = 5

/** A streak only means something once it is worth keeping alive. */
const MINIMUM_VISIBLE_STREAK = 2

const resultDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Europe/Madrid',
})

type MemberSeasonPanelProps = {
  summary: MemberSeasonSummary
  density?: 'compact' | 'full'
  title?: string
  footer?: ReactNode
}

function RankDelta({ delta }: { delta: number }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return (
    <span className="member-season__delta" data-trend={trend}>
      <Icon aria-hidden="true" size={14} />
      {formatRankDelta(delta)}
    </span>
  )
}

export function MemberSeasonPanel({
  summary,
  density = 'full',
  title = 'Tu temporada',
  footer,
}: MemberSeasonPanelProps) {
  const titleId = useId()
  const [showAllResults, setShowAllResults] = useState(false)
  const { bestResult, player, projection, results, season } = summary
  const isRanked = Boolean(player)
  const visibleResults = showAllResults
    ? results
    : results.slice(0, VISIBLE_RESULTS)

  return (
    <section
      className={`member-season member-season--${density}${
        density === 'compact' ? ' dashboard-card' : ''
      }`}
      aria-labelledby={titleId}
    >
      <div className="member-season__topline">
        <span className="dashboard-label">
          <Trophy aria-hidden="true" size={15} />
          {title}
        </span>
        {summary.rankDelta === undefined ? null : (
          <RankDelta delta={summary.rankDelta} />
        )}
      </div>

      <h2 id={titleId}>
        {player ? `Posición ${player.rank}` : 'Aún no estás clasificado'}
      </h2>
      <p className="member-season__context">
        {player
          ? `${player.points} puntos comunidad · ${season.name}`
          : `${season.name} · ${summary.seasonEvents} eventos puntuables`}
      </p>

      {density === 'full' && player ? (
        <>
          <ul className="member-season__facts">
            <li>
              {player.eventsPlayed} de {summary.seasonEvents} eventos puntuables
            </li>
            {summary.pointsToPlaceAbove === undefined ? (
              <li>Lideras la clasificación</li>
            ) : (
              <li>
                A {summary.pointsToPlaceAbove}{' '}
                {summary.pointsToPlaceAbove === 1 ? 'punto' : 'puntos'} de la
                posición {player.rank - 1}
              </li>
            )}
            {summary.pointsOverPlaceBelow === undefined ? null : (
              <li>
                {summary.pointsOverPlaceBelow}{' '}
                {summary.pointsOverPlaceBelow === 1 ? 'punto' : 'puntos'} sobre
                la posición {player.rank + 1}
              </li>
            )}
          </ul>

          {bestResult && results.length > 1 ? (
            <p className="member-season__best">
              Mejor resultado: {formatPlacement(bestResult.rank)} en{' '}
              {bestResult.event.title} · {bestResult.players} jugadores
            </p>
          ) : null}

          {summary.currentStreak >= MINIMUM_VISIBLE_STREAK ? (
            <p className="member-season__streak">
              <Flame aria-hidden="true" size={15} />
              {summary.currentStreak} eventos puntuables seguidos
            </p>
          ) : null}
        </>
      ) : null}

      {projection ? (
        <p className="member-season__projection">
          {formatSeasonProjection(projection, isRanked)}
        </p>
      ) : null}

      {density === 'full' && results.length > 0 ? (
        <>
          <ol
            className="member-season-results"
            aria-label="Tus resultados de la temporada"
          >
            {visibleResults.map((result) => (
              <li key={result.event.id}>
                <span className="member-season-results__rank">
                  {formatPlacement(result.rank)}
                </span>
                <span className="member-season-results__event">
                  <strong>{result.event.title}</strong>
                  <small>
                    {resultDateFormatter.format(new Date(result.playedAt))} ·{' '}
                    {result.players} jugadores
                  </small>
                </span>
                <span
                  className="member-season-results__points"
                  aria-label={`Más ${result.points} puntos comunidad`}
                >
                  +{result.points}
                </span>
              </li>
            ))}
          </ol>

          {results.length > VISIBLE_RESULTS ? (
            <button
              className="member-season__toggle"
              type="button"
              aria-expanded={showAllResults}
              onClick={() => setShowAllResults((current) => !current)}
            >
              {showAllResults
                ? 'Ver menos resultados'
                : `Ver los ${results.length} resultados`}
            </button>
          ) : null}
        </>
      ) : null}

      {footer}
    </section>
  )
}
