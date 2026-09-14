import { useState } from 'react'

import { BadgeMark } from './BadgeMark'
import { BadgePreview, type BadgePreviewSubject } from './BadgePreview'
import { CommunityBadgesBoard } from './CommunityBadgesBoard'
import { ShareActions } from './ShareActions'
import { formatBadgeUnlockForWhatsApp } from '../data/badgeSharing'
import {
  getMemberBadgeLadders,
  getMemberSeasonBadges,
  getSeasonBadgeBoard,
  type MemberBadge,
} from '../data/rankingBadges'
import { getBadgeTiers } from '../domain/badges'
import type { DemoDataSet } from '../domain/types'

const TIER_LABELS = {
  bronze: 'bronce',
  silver: 'plata',
  gold: 'oro',
} as const

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
  // Badges only exist for MTG today: the whole catalogue is written in
  // Magic's own keywords, so there is no game picker to show.
  const gameId = 'game-mtg'
  const [seasonId, setSeasonId] = useState(
    seasons.find(({ status }) => status === 'active')?.id ??
      seasons[0]?.id ??
      '',
  )
  const [openBadgeId, setOpenBadgeId] = useState<string>()
  const [view, setView] = useState<'mine' | 'community'>('mine')
  const [preview, setPreview] = useState<BadgePreviewSubject>()
  const [showEveryLocked, setShowEveryLocked] = useState(false)

  const scope = { gameId, seasonId }
  const badgesUrl = new URL(window.location.href)
  badgesUrl.hash = `ranking?view=badges&game=${gameId}&season=${seasonId}`
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
  const member = data.members.find(({ id }) => id === memberId)
  const holdersById = new Map(
    board.badges.map(({ definition, holders }) => [definition.id, holders]),
  )
  const tiers = getBadgeTiers(memberBadges.map(({ definition }) => definition))
  const unlocked = memberBadges.filter(({ unlockedAt }) => unlockedAt)
  const ladders = getMemberBadgeLadders(memberBadges)
  // Closest first: the next rung should read as reachable, not as a wall.
  const nextRungs = ladders
    .flatMap((ladder) => (ladder.next ? [{ ladder, step: ladder.next }] : []))
    .sort((first, second) => distanceOf(second.step) - distanceOf(first.step))
  const completedLadders = ladders.filter(
    ({ next, steps }) => !next && steps.length > 0,
  )
  const earnedTiers = (['gold', 'silver', 'bronze'] as const)
    .map((tier) => ({
      tier,
      count: unlocked.filter(
        ({ definition }) => tiers.get(definition.id) === tier,
      ).length,
    }))
    .filter(({ count }) => count > 0)

  /**
   * The vitrine opens a badge in the dialog, so sharing has to live there too
   * rather than only inside an expanded catalogue row.
   */
  function shareActionsFor(badgeId: string) {
    const held = unlocked.find(({ definition }) => definition.id === badgeId)

    return isSelf && held?.unlockedAt && member ? (
      <ShareActions
        className="season-badge__share"
        copiedLabel="Insignia copiada"
        copyLabel="Copiar"
        copySuccessMessage="Insignia copiada. Ya puedes pegarla en WhatsApp."
        shareLabel="Compartir insignia"
        shareText={formatBadgeUnlockForWhatsApp({
          badgeUrl: badgesUrl.toString(),
          communityName: data.community.name,
          season,
          unlock: {
            definition: held.definition,
            member,
            unlockedAt: held.unlockedAt,
          },
        })}
      />
    ) : null
  }

  function renderBadge(badge: MemberBadge) {
    const { definition, progress, unlockedAt } = badge
    const holders = holdersById.get(definition.id) ?? []
    const isOpen = openBadgeId === definition.id

    return (
      <li className="season-badge" key={definition.id}>
        <div className="season-badge__summary">
          <button
            type="button"
            className="badge-mark-button"
            aria-label={`Ver ${definition.name} en grande`}
            onClick={() =>
              setPreview({
                definition,
                progress,
                unlocked: Boolean(unlockedAt),
              })
            }
          >
            <BadgeMark
              badgeId={definition.id}
              label={`${definition.name}${unlockedAt ? ', desbloqueada' : ''}`}
              progress={progress}
              tier={tiers.get(definition.id)}
              unlocked={Boolean(unlockedAt)}
            />
          </button>
          <button
            type="button"
            className="season-badge__details"
            aria-expanded={isOpen}
            onClick={() => setOpenBadgeId(isOpen ? undefined : definition.id)}
          >
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
        </div>

        {isOpen ? (
          <div className="season-badge__detail">
            <p className="season-badge__reference">{definition.reference}</p>
            {unlockedAt ? (
              <p className="season-badge__unlocked">
                Desbloqueada el{' '}
                {unlockDateFormatter.format(new Date(unlockedAt))}
              </p>
            ) : null}
            {unlockedAt && member ? (
              <ShareActions
                className="season-badge__share"
                copiedLabel="Insignia copiada"
                copyLabel="Copiar"
                copySuccessMessage="Insignia copiada. Ya puedes pegarla en WhatsApp."
                shareLabel="Compartir insignia"
                shareText={formatBadgeUnlockForWhatsApp({
                  badgeUrl: badgesUrl.toString(),
                  communityName: data.community.name,
                  season,
                  unlock: { definition, member, unlockedAt },
                })}
              />
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
      </div>

      {isSelf ? (
        <div
          className="ranking-segmented season-badges__view"
          aria-label="Vista de insignias"
        >
          <button
            type="button"
            aria-pressed={view === 'mine'}
            onClick={() => setView('mine')}
          >
            Mi colección
          </button>
          <button
            type="button"
            aria-pressed={view === 'community'}
            onClick={() => setView('community')}
          >
            Toda la comunidad
          </button>
        </div>
      ) : null}

      <div className="season-badges__heading">
        <div>
          <span>
            {view === 'community'
              ? 'Quién tiene cada insignia'
              : isSelf
                ? 'Tu colección'
                : 'Su colección'}
          </span>
          <h2 id="season-badges-title">
            {view === 'community'
              ? `${players} ${players === 1 ? 'jugador' : 'jugadores'}`
              : `${unlocked.length} ${
                  unlocked.length === 1 ? 'insignia' : 'insignias'
                }`}
          </h2>
          {view === 'mine' && earnedTiers.length > 0 ? (
            <small className="season-badges__tiers">
              {earnedTiers
                .map(({ count, tier }) => `${count} ${TIER_LABELS[tier]}`)
                .join(' · ')}
            </small>
          ) : null}
        </div>
        <p>{season.name}</p>
      </div>

      {view === 'community' ? (
        <CommunityBadgesBoard
          board={board}
          onOpenMember={onOpenMember}
          onPreview={setPreview}
        />
      ) : null}

      {view === 'mine' && unlocked.length > 0 ? (
        <>
          <h3>Vitrina</h3>
          <ul className="badge-case" aria-label="Insignias desbloqueadas">
            {unlocked.map(({ definition }) => (
              <li key={definition.id}>
                <button
                  type="button"
                  className="badge-case__item"
                  aria-label={`Ver ${definition.name} en grande`}
                  onClick={() =>
                    setPreview({
                      definition,
                      tier: tiers.get(definition.id),
                      unlocked: true,
                    })
                  }
                >
                  <BadgeMark
                    badgeId={definition.id}
                    label={definition.name}
                    tier={tiers.get(definition.id)}
                    unlocked
                  />
                  <span>{definition.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {view === 'mine' && nextRungs.length > 0 ? (
        <>
          <h3>Tu próximo paso</h3>
          <ul className="badge-next" aria-label="Tu próximo paso">
            {nextRungs.map(({ ladder, step }) => (
              <li key={ladder.id}>
                <button
                  type="button"
                  className="badge-mark-button"
                  aria-label={`Ver ${step.definition.name} en grande`}
                  onClick={() =>
                    setPreview({
                      definition: step.definition,
                      progress: step.progress,
                      tier: step.tier,
                      unlocked: false,
                    })
                  }
                >
                  <BadgeMark
                    badgeId={step.definition.id}
                    label={step.definition.name}
                    progress={step.progress}
                    tier={step.tier}
                    unlocked={false}
                  />
                </button>
                <span className="badge-next__identity">
                  <small className="badge-next__ladder">{ladder.label}</small>
                  <strong>{step.definition.name}</strong>
                  <small>{step.definition.description}</small>
                </span>
                {step.progress ? (
                  <span className="badge-next__progress">
                    <span className="badge-next__bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.round(
                            (step.progress.current / step.progress.target) *
                              100,
                          )}%`,
                        }}
                      />
                    </span>
                    <small>
                      {step.progress.current} de {step.progress.target}
                    </small>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {view === 'mine' && completedLadders.length > 0 ? (
        <p className="badge-next__done">
          Completas: {completedLadders.map(({ label }) => label).join(' · ')}
        </p>
      ) : null}

      {view === 'mine' ? (
        <>
          <button
            className="season-badges__toggle"
            type="button"
            aria-expanded={showEveryLocked}
            onClick={() => setShowEveryLocked((current) => !current)}
          >
            {showEveryLocked ? 'Ocultar el catálogo' : 'Ver todo el catálogo'}
          </button>
          {showEveryLocked
            ? ladders.map(({ id, label, steps }) => (
                <section className="community-badge-ladder" key={id}>
                  <h3>{label}</h3>
                  <ul
                    className="season-badges__list"
                    aria-label={`Insignias de ${label.toLowerCase()}`}
                  >
                    {steps.map(renderBadge)}
                  </ul>
                </section>
              ))
            : null}
        </>
      ) : null}

      {preview ? (
        <BadgePreview
          actions={shareActionsFor(preview.definition.id)}
          badge={preview}
          onClose={() => setPreview(undefined)}
        />
      ) : null}
    </section>
  )
}
