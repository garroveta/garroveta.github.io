import type { ReactNode } from 'react'

import type { MarketplaceListingItem } from '../data/cardSelectors'
import {
  cardConditionLabels,
  cardLanguageLabels,
  formatMarketplacePrice,
} from '../data/cardPresentation'
import { getScryfallCardImage } from '../data/scryfallImages'

type MarketplaceListingRowProps = {
  action?: ReactNode
  item: MarketplaceListingItem
  onMemberSelect?: (memberId: string) => void
  onOpen?: (item: MarketplaceListingItem) => void
  onPreview?: (item: MarketplaceListingItem) => void
  variant: 'community-table' | 'member-list'
}

export function MarketplaceListingRow({
  action,
  item,
  onMemberSelect,
  onOpen,
  onPreview,
  variant,
}: MarketplaceListingRowProps) {
  const imageUrl = getScryfallCardImage(item.card.name, item.card.imageUri)
  const cardMeta = (
    <>
      {item.card.setName} · #{item.card.collectorNumber}
      {item.listing.finish === 'foil' ? ' · Foil' : ''}
    </>
  )

  if (variant === 'community-table') {
    return (
      <tr
        className="market-table__row-action"
        tabIndex={0}
        aria-label={`Abrir oferta de ${item.card.name} de ${item.member.displayName}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          onOpen?.(item)
        }}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === 'Enter' || event.key === ' ')
          ) {
            event.preventDefault()
            onOpen?.(item)
          }
        }}
      >
        <td>
          <div className="market-table__card">
            <button
              className="market-table__card-preview"
              type="button"
              aria-label={`Ampliar ${item.card.name}`}
              onClick={() => onPreview?.(item)}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <span>{item.card.setCode}</span>
              )}
            </button>
            <span>
              <strong>{item.card.name}</strong>
              <small>{cardMeta}</small>
              <small className="market-table__mobile-meta">
                {cardLanguageLabels[item.listing.language]} ·{' '}
                {cardConditionLabels[item.listing.condition]}
              </small>
              {onMemberSelect ? (
                <button
                  className="market-table__member"
                  type="button"
                  aria-label={`Ver cartas de ${item.member.displayName}`}
                  onClick={() => onMemberSelect(item.member.id)}
                >
                  {item.member.displayName}
                </button>
              ) : null}
            </span>
          </div>
        </td>
        <td className="market-table__wide">
          {cardLanguageLabels[item.listing.language]}
        </td>
        <td className="market-table__wide">
          {cardConditionLabels[item.listing.condition]}
        </td>
        <td className="market-table__quantity">{item.listing.quantity}</td>
        <td className="market-table__price">
          {item.listing.priceEur ? (
            formatMarketplacePrice(item.listing.priceEur)
          ) : (
            <>
              <span
                className="market-table__price-mobile"
                aria-label="A convenir"
              >
                —
              </span>
              <span className="market-table__price-desktop">A convenir</span>
            </>
          )}
        </td>
      </tr>
    )
  }

  return (
    <article className="shared-card-row">
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="card-set-symbol">{item.card.setCode}</span>
      )}
      <div className="shared-card-row__body">
        <h3>{item.card.name}</h3>
        <p>
          {item.card.setName} · {item.card.setCode} #{item.card.collectorNumber}
          {item.listing.finish === 'foil' ? ' · Foil' : ''}
        </p>
        <dl className="shared-card-row__facts">
          <div>
            <dt>Cantidad</dt>
            <dd>{item.listing.quantity}</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd>{formatMarketplacePrice(item.listing.priceEur)}</dd>
          </div>
          <div>
            <dt>Idioma</dt>
            <dd>{cardLanguageLabels[item.listing.language]}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{cardConditionLabels[item.listing.condition]}</dd>
          </div>
        </dl>
      </div>
      <div className="shared-card-row__actions">{action}</div>
    </article>
  )
}
