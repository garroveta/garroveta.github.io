import { useState } from 'react'

import { BadgeMark } from './BadgeMark'
import {
  getMemberSeasonBadges,
  getSeasonBadgeBoard,
  type MemberBadge,
} from '../data/rankingBadges'
import type { DemoDataSet } from '../domain/types'

/** Enough to see what is within reach without turning the rest into a wall. */
const VISIBLE_IN_PROGRESS = 3

const seasonGlyphs: Record<string, string> = {
  monarch: '♛',
  paragon: '✦',
}

const unlockDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

type SeasonBadgesPanelProps = {
  data: DemoDataSet
  memberId: string
  perspective?: 'self' | 'other'
  onOpenMember?: (memberId: string) => void
}

function distanceOf({ progress }: MemberBadge) {
  return progress ? progress.current / progress.target : 0
}

export function SeasonBadgesPanel({
  data,
  memberId,
  perspective = 'self',
  onOpenMember,
}: SeasonBadgesPanelProps) {
  const isSelf = perspective === 'self'
  const seasons = data.rankingSeasons
    .filter(({ status }) => status !== 'upcoming')
    .sort((first, second) => second.startsOn.localeCompare(first.startsOn))
  const games = data.games.filter(
    ({ category }) => category !== 'role_playing_game',
  )
  const [gameId, setGameId] = useState('game-mtg')
  const [seasonId, setSeasonId] = useState(
    seasons.find(({ status }) => status === 'active')?.id ??
      seasons[0]?.id ??
      '',
  )
  const [openBadgeId, setOpenBadgeId] = useState<string>()
  const [showEveryLocked, setShowEveryLocked] = useState(false)

  const scope = { gameId, seasonId }
  const board = getSeasonBadgeBoard(data, scope)
  const memberBadges = getMemberSeasonBadges(data, memberId, scope)

  if (!board || !memberBadges) {
    return (
      <section className="season-badges" aria-labelledby="season-badges-title">
        <h2 id="season-badges-title">Insignias</h2>
        <p>Todavía no hay una temporada con resultados.</p>
      </section>
    )
  }

  const { players, season } = board
  const holdersById = new Map(
    board.badges.map(({ definition, holders }) => [definition.id, holders]),
  )
  const unlocked = memberBadges.filter(({ unlockedAt }) => unlockedAt)
  const inProgress = memberBadges
    .filter(({ unlockedAt }) => !unlockedAt)
    .sort((first, second) => distanceOf(second) - distanceOf(first))
  const visibleInProgress = showEveryLocked
    ? inProgress
    : inProgress.slice(0, VISIBLE_IN_PROGRESS)

  function renderBadge(badge: MemberBadge) {
    const { definition, progress, unlockedAt } = badge
    const holders = holdersById.get(definition.id) ?? []
    const isOpen = openBadgeId === definition.id

    return (
      <li className="season-badge" key={definition.id}>
        <button
          type="button"
          className="season-badge__summary"
          aria-expanded={isOpen}
          onClick={() => setOpenBadgeId(isOpen ? undefined : definition.id)}
        >
          <BadgeMark
            glyph={seasonGlyphs[definition.id]}
            label={`${definition.name}${unlockedAt ? ', desbloqueada' : ''}`}
            progress={progress}
            unlocked={Boolean(unlockedAt)}
          />
          <span className="season-badge__identity">
            <strong>{definition.name}</strong>
            <small>{definition.description}</small>
          </span>
          <span className="season-badge__stat">
            {progress && !unlockedAt ? (
              <em>
                {progress.current}/{progress.target}
              </em>
            ) : null}
            <small>
              {holders.length} de {players}
            </small>
          </span>
        </button>

        {isOpen ? (
          <div className="season-badge__detail">
            <p className="season-badge__reference">{definition.reference}</p>
            {unlockedAt ? (
              <p className="season-badge__unlocked">
                Desbloqueada el{' '}
                {unlockDateFormatter.format(new Date(unlockedAt))}
              </p>
            ) : null}
            {holders.length > 0 ? (
              <ul
                className="season-badge__holders"
                aria-label={`Quién tiene ${definition.name}`}
              >
                {holders.map(({ member }) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      disabled={!onOpenMember}
                      onClick={() => onOpenMember?.(member.id)}
                    >
                      <span aria-hidden="true">{member.initials}</span>
                      <span className="visually-hidden">
                        {member.displayName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="season-badge__holders--empty">
                Nadie la tiene todavía.
                {isSelf ? ' Podrías ser la primera persona.' : ''}
              </p>
            )}
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <section className="season-badges" aria-labelledby="season-badges-title">
      <div className="ranking-select-grid">
        <label className="form-field">
          <span>Temporada</span>
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.status === 'active' ? ' · Activa' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Juego</span>
          <select
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.shortName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="season-badges__heading">
        <div>
          <span>{isSelf ? 'Tu colección' : 'Su colección'}</span>
          <h2 id="season-badges-title">
            {unlocked.length} de {memberBadges.length}
          </h2>
        </div>
        <p>{season.name}</p>
      </div>

      {unlocked.length > 0 ? (
        <>
          <h3>Desbloqueadas</h3>
          <ul
            className="season-badges__list"
            aria-label="Insignias desbloqueadas"
          >
            {unlocked.map(renderBadge)}
          </ul>
        </>
      ) : null}

      {inProgress.length > 0 ? (
        <>
          <h3>En progreso</h3>
          <ul
            className="season-badges__list"
            aria-label="Insignias en progreso"
          >
            {visibleInProgress.map(renderBadge)}
          </ul>
          {inProgress.length > VISIBLE_IN_PROGRESS ? (
            <button
              className="season-badges__toggle"
              type="button"
              aria-expanded={showEveryLocked}
              onClick={() => setShowEveryLocked((current) => !current)}
            >
              {showEveryLocked
                ? 'Ver solo las más cercanas'
                : `Ver las ${inProgress.length} insignias en progreso`}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
