import { BadgeMark } from './BadgeMark'
import type { BadgePreviewSubject } from './BadgePreview'
import { getBadgeLadders } from '../domain/badges'
import type { SeasonBadgeBoard } from '../data/rankingBadges'

type CommunityBadgesBoardProps = {
  board: SeasonBadgeBoard
  onOpenMember?: (memberId: string) => void
  onPreview?: (badge: BadgePreviewSubject) => void
}

/**
 * The catalogue seen from the community rather than from one member. Grouped
 * by ladder, easiest rung first: sixteen badges in a flat list read as an
 * inventory, the same sixteen as eight ladders read as a way up. A rung nobody
 * holds stays in its ladder, greyed, rather than in a separate list of
 * leftovers — it is the next step for someone, not a reject.
 */
export function CommunityBadgesBoard({
  board,
  onOpenMember,
  onPreview,
}: CommunityBadgesBoardProps) {
  const holdersById = new Map(
    board.badges.map(({ definition, holders }) => [definition.id, holders]),
  )
  const ladders = getBadgeLadders(
    board.badges.map(({ definition }) => definition),
  )
  const claimedCount = board.badges.filter(
    ({ holders }) => holders.length > 0,
  ).length

  return (
    <div className="community-badges">
      {claimedCount === 0 ? (
        <p className="community-badges__empty">
          Nadie ha desbloqueado una insignia todavía esta temporada.
        </p>
      ) : null}

      {ladders.map(({ id, label, steps }) => (
        <section className="community-badge-ladder" key={id}>
          <h3>{label}</h3>
          <ul
            className="community-badges__list"
            aria-label={`Quién tiene las insignias de ${label.toLowerCase()}`}
          >
            {steps.map(({ badge, tier }) => {
              const holders = holdersById.get(badge.id) ?? []
              const progress = badge.target
                ? { current: 0, target: badge.target }
                : undefined
              const unlocked = holders.length > 0

              return (
                <li
                  className={`community-badge${
                    unlocked ? '' : ' community-badge--empty'
                  }`}
                  key={badge.id}
                >
                  <div className="community-badge__summary">
                    <button
                      type="button"
                      className="badge-mark-button"
                      aria-label={`Ver ${badge.name} en grande`}
                      onClick={() =>
                        onPreview?.({
                          definition: badge,
                          progress: unlocked ? undefined : progress,
                          unlocked,
                        })
                      }
                    >
                      <BadgeMark
                        badgeId={badge.id}
                        label={badge.name}
                        progress={unlocked ? undefined : progress}
                        tier={tier}
                        unlocked={unlocked}
                      />
                    </button>
                    <span className="community-badge__identity">
                      <strong>{badge.name}</strong>
                      <small>{badge.description}</small>
                    </span>
                    <span className="community-badge__rarity">
                      {unlocked
                        ? `${holders.length} de ${board.players}`
                        : 'Sin dueño'}
                    </span>
                  </div>
                  {unlocked ? (
                    <ul
                      className="community-badge__holders"
                      aria-label={`Quién tiene ${badge.name}`}
                    >
                      {holders.map(({ member }) => (
                        <li key={member.id}>
                          <button
                            type="button"
                            disabled={!onOpenMember}
                            onClick={() => onOpenMember?.(member.id)}
                          >
                            {member.displayName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
