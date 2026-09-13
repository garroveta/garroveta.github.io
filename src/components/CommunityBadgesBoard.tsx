import { BadgeMark } from './BadgeMark'
import type { SeasonBadgeBoard } from '../data/rankingBadges'

const seasonGlyphs: Record<string, string> = {
  monarch: '♛',
  paragon: '✦',
}

type CommunityBadgesBoardProps = {
  board: SeasonBadgeBoard
  onOpenMember?: (memberId: string) => void
}

/**
 * The catalogue seen from the community rather than from one member: every
 * badge with the people who hold it, rarest first, so the page reads as a
 * roll of honour and not as an inventory.
 */
export function CommunityBadgesBoard({
  board,
  onOpenMember,
}: CommunityBadgesBoardProps) {
  const claimed = board.badges
    .filter(({ holders }) => holders.length > 0)
    .sort((first, second) => first.holders.length - second.holders.length)
  const unclaimed = board.badges.filter(({ holders }) => holders.length === 0)

  return (
    <div className="community-badges">
      {claimed.length === 0 ? (
        <p className="community-badges__empty">
          Nadie ha desbloqueado una insignia todavía esta temporada.
        </p>
      ) : (
        <ul
          className="community-badges__list"
          aria-label="Quién tiene cada insignia"
        >
          {claimed.map(({ definition, holders }) => (
            <li className="community-badge" key={definition.id}>
              <div className="community-badge__summary">
                <BadgeMark
                  badgeId={definition.id}
                  glyph={seasonGlyphs[definition.id]}
                  label={definition.name}
                  unlocked
                />
                <span className="community-badge__identity">
                  <strong>{definition.name}</strong>
                  <small>{definition.description}</small>
                </span>
                <span className="community-badge__rarity">
                  {holders.length} de {board.players}
                </span>
              </div>
              <ul
                className="community-badge__holders"
                aria-label={`Quién tiene ${definition.name}`}
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
            </li>
          ))}
        </ul>
      )}

      {unclaimed.length > 0 ? (
        <>
          <h3>Todavía sin dueño</h3>
          <ul
            className="community-badges__unclaimed"
            aria-label="Insignias que nadie tiene todavía"
          >
            {unclaimed.map(({ definition }) => (
              <li key={definition.id}>
                <BadgeMark
                  badgeId={definition.id}
                  glyph={seasonGlyphs[definition.id]}
                  label={definition.name}
                  progress={
                    definition.target
                      ? { current: 0, target: definition.target }
                      : undefined
                  }
                  unlocked={false}
                />
                <span>
                  <strong>{definition.name}</strong>
                  <small>{definition.description}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
