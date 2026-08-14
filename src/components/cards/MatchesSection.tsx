import { ChevronRight } from 'lucide-react'

import {
  cardConditionLabels as conditionLabels,
  cardLanguageLabels as languageLabels,
} from '../../data/cardPresentation'
import { matchStatusLabels } from '../../data/cardMatchPresentation'
import type { MemberCardMatchItem } from '../../data/cardSelectors'
import { getScryfallCardImage } from '../../data/scryfallImages'

export type MatchGrouping = 'card' | 'member'

function groupCardMatches(
  matches: MemberCardMatchItem[],
  grouping: MatchGrouping,
) {
  const groups = new Map<string, MemberCardMatchItem[]>()

  for (const item of matches) {
    const key = grouping === 'card' ? item.card.id : item.seller.id
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  return [...groups.values()]
}

function MatchGroupCard({
  items,
  grouping,
  onPreview,
  onSelect,
}: {
  items: MemberCardMatchItem[]
  grouping: MatchGrouping
  onPreview: (item: MemberCardMatchItem) => void
  onSelect: (matchId: string) => void
}) {
  const firstItem = items[0]

  if (!firstItem) return null

  const isCardGroup = grouping === 'card'

  return (
    <article className="match-group-card">
      <header className="match-group-card__header">
        {isCardGroup ? (
          <button
            className="match-card-preview"
            type="button"
            aria-label={`Ampliar ${firstItem.card.name}`}
            onClick={() => onPreview(firstItem)}
          >
            <img
              src={getScryfallCardImage(
                firstItem.card.name,
                firstItem.card.imageUri,
              )}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </button>
        ) : (
          <span className="member-initials" aria-hidden="true">
            {firstItem.seller.initials}
          </span>
        )}
        <div>
          <h3>
            {isCardGroup ? firstItem.card.name : firstItem.seller.displayName}
          </h3>
          <p>
            {isCardGroup
              ? `${firstItem.card.setName} · #${firstItem.card.collectorNumber}`
              : `${items.length} ${items.length === 1 ? 'carta buscada disponible' : 'cartas buscadas disponibles'}`}
          </p>
        </div>
        <strong className="match-group-card__count">
          {items.length}{' '}
          {isCardGroup
            ? items.length === 1
              ? 'miembro'
              : 'miembros'
            : items.length === 1
              ? 'carta'
              : 'cartas'}
        </strong>
      </header>

      <div className="match-group-card__list">
        {items.map((item) => {
          const primaryLabel = isCardGroup
            ? item.seller.displayName
            : item.card.name
          const imageUrl = getScryfallCardImage(
            item.card.name,
            item.card.imageUri,
          )

          return (
            <button
              className="compact-match-row"
              type="button"
              key={item.match.id}
              aria-label={`Ver coincidencia de ${item.card.name} con ${item.seller.displayName}`}
              onClick={() => onSelect(item.match.id)}
            >
              {isCardGroup ? (
                <span className="member-initials" aria-hidden="true">
                  {item.seller.initials}
                </span>
              ) : imageUrl ? (
                <img
                  className="compact-match-row__card-image"
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="card-set-symbol" aria-hidden="true">
                  {item.card.setCode}
                </span>
              )}
              <span className="compact-match-row__identity">
                <strong>{primaryLabel}</strong>
                <small>
                  {matchStatusLabels[item.match.status]} ·{' '}
                  {languageLabels[item.listing.language]} ·{' '}
                  {conditionLabels[item.listing.condition]}
                </small>
              </span>
              <span className="compact-match-row__score">
                {item.match.score}%
              </span>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          )
        })}
      </div>
    </article>
  )
}

type MatchesSectionProps = {
  grouping: MatchGrouping
  matches: MemberCardMatchItem[]
  onGroupingChange: (grouping: MatchGrouping) => void
  onPreview: (item: MemberCardMatchItem) => void
  onSelect: (matchId: string) => void
}

export function MatchesSection({
  grouping,
  matches,
  onGroupingChange,
  onPreview,
  onSelect,
}: MatchesSectionProps) {
  const groupedMatches = groupCardMatches(matches, grouping)

  return (
    <section className="cards-section" aria-labelledby="matches-title">
      <div className="section-heading">
        <div>
          <span>Cruce automático</span>
          <h2 id="matches-title">Tus coincidencias</h2>
        </div>
        <p>{matches.length} ofertas compatibles</p>
      </div>

      <div className="match-grouping-control">
        <span>Organizar</span>
        <div role="group" aria-label="Organizar coincidencias">
          <button
            type="button"
            aria-pressed={grouping === 'card'}
            onClick={() => onGroupingChange('card')}
          >
            Por carta
          </button>
          <button
            type="button"
            aria-pressed={grouping === 'member'}
            onClick={() => onGroupingChange('member')}
          >
            Por miembro
          </button>
        </div>
      </div>

      <div className="match-group-grid">
        {matches.length > 0 ? (
          groupedMatches.map((items) => (
            <MatchGroupCard
              items={items}
              grouping={grouping}
              key={
                grouping === 'card' ? items[0]?.card.id : items[0]?.seller.id
              }
              onPreview={onPreview}
              onSelect={onSelect}
            />
          ))
        ) : (
          <p className="filtered-empty-state">
            Aún no hay ofertas compatibles con tus búsquedas.
          </p>
        )}
      </div>
    </section>
  )
}
