import type { MarketplaceListingItem } from '../data/cardSelectors'
import {
  cardConditionLabels,
  cardLanguageLabels,
  formatMarketplacePrice,
} from '../data/cardPresentation'
import { getScryfallCardImage } from '../data/scryfallImages'
import { MarketplaceListingAction } from './MarketplaceListingAction'

type MarketplaceListingGalleryProps = {
  ariaLabel: string
  columns: 2 | 4
  currentMemberId: string
  items: MarketplaceListingItem[]
  onMemberSelect?: (memberId: string) => void
  onOpen: (item: MarketplaceListingItem) => void
  onPreview: (item: MarketplaceListingItem) => void
  ownerMode?: 'open' | 'status'
}

export function MarketplaceListingGallery({
  ariaLabel,
  columns,
  currentMemberId,
  items,
  onMemberSelect,
  onOpen,
  onPreview,
  ownerMode,
}: MarketplaceListingGalleryProps) {
  return (
    <div
      className={`market-gallery market-gallery--${columns}`}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const imageUrl = getScryfallCardImage(
          item.card.name,
          item.card.imageUri,
        )

        return (
          <article
            className="market-gallery-card"
            key={item.listing.id}
            tabIndex={0}
            aria-label={`Abrir oferta de ${item.card.name} de ${item.member.displayName}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) return
              onOpen(item)
            }}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault()
                onOpen(item)
              }
            }}
          >
            <button
              className="market-gallery-card__image"
              type="button"
              aria-label={`Ampliar ${item.card.name}`}
              onClick={() => onPreview(item)}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${item.card.name}, imagen de Scryfall`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span>{item.card.setCode}</span>
              )}
            </button>
            <span
              className="market-gallery-card__quantity"
              aria-label={`Cantidad ${item.listing.quantity}`}
            >
              ×{item.listing.quantity}
            </span>
            <div className="market-gallery-card__content">
              <div>
                <h3>{item.card.name}</h3>
                <p>
                  {item.card.setName} · #{item.card.collectorNumber}
                  {item.listing.finish === 'foil' ? ' · Foil' : ''}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Idioma</dt>
                  <dd>{cardLanguageLabels[item.listing.language]}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{cardConditionLabels[item.listing.condition]}</dd>
                </div>
                <div>
                  <dt>Cantidad</dt>
                  <dd>{item.listing.quantity}</dd>
                </div>
                <div>
                  <dt>Precio</dt>
                  <dd>{formatMarketplacePrice(item.listing.priceEur)}</dd>
                </div>
              </dl>
              <div
                className={`market-gallery-card__actions${onMemberSelect ? '' : ' market-gallery-card__actions--single'}`}
              >
                {onMemberSelect ? (
                  <button
                    className="market-gallery-card__member"
                    type="button"
                    onClick={() => onMemberSelect(item.member.id)}
                  >
                    <span className="member-initials" aria-hidden="true">
                      {item.member.initials}
                    </span>
                    <span>
                      <small>Disponible por</small>
                      <strong>{item.member.displayName}</strong>
                    </span>
                  </button>
                ) : null}
                <MarketplaceListingAction
                  currentMemberId={currentMemberId}
                  item={item}
                  ownerMode={ownerMode}
                  onOpen={onOpen}
                />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
