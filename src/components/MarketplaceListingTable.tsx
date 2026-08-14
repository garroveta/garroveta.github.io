import type { MarketplaceListingItem } from '../data/cardSelectors'
import {
  cardConditionLabels,
  cardLanguageLabels,
  formatMarketplacePrice,
} from '../data/cardPresentation'
import { getScryfallCardImage } from '../data/scryfallImages'

type MarketplaceListingTableProps = {
  ariaLabel: string
  items: MarketplaceListingItem[]
  onMemberSelect?: (memberId: string) => void
  onOpen?: (item: MarketplaceListingItem) => void
  onPreview?: (item: MarketplaceListingItem) => void
}

export function MarketplaceListingTable({
  ariaLabel,
  items,
  onMemberSelect,
  onOpen,
  onPreview,
}: MarketplaceListingTableProps) {
  return (
    <div className="market-table-wrap">
      <table className="market-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th scope="col">Carta</th>
            <th className="market-table__wide" scope="col">
              Idioma
            </th>
            <th className="market-table__wide" scope="col">
              Estado
            </th>
            <th scope="col">
              <abbr title="Cantidad">Cant.</abbr>
            </th>
            <th scope="col">Precio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const imageUrl = getScryfallCardImage(
              item.card.name,
              item.card.imageUri,
            )
            const isInteractive = Boolean(onOpen)

            return (
              <tr
                className={isInteractive ? 'market-table__row-action' : ''}
                key={item.listing.id}
                tabIndex={isInteractive ? 0 : undefined}
                aria-label={
                  isInteractive
                    ? `Abrir oferta de ${item.card.name} de ${item.member.displayName}`
                    : undefined
                }
                onClick={(event) => {
                  if (
                    !isInteractive ||
                    (event.target as HTMLElement).closest('button')
                  ) {
                    return
                  }
                  onOpen?.(item)
                }}
                onKeyDown={(event) => {
                  if (
                    isInteractive &&
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
                    {onPreview ? (
                      <button
                        className="market-table__card-preview"
                        type="button"
                        aria-label={`Ampliar ${item.card.name}`}
                        onClick={() => onPreview(item)}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span>{item.card.setCode}</span>
                        )}
                      </button>
                    ) : (
                      <span
                        className="market-table__card-preview market-table__card-preview--static"
                        aria-hidden="true"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span>{item.card.setCode}</span>
                        )}
                      </span>
                    )}
                    <span>
                      <strong>{item.card.name}</strong>
                      <small>
                        {item.card.setName} · #{item.card.collectorNumber}
                        {item.listing.finish === 'foil' ? ' · Foil' : ''}
                      </small>
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
                <td className="market-table__quantity">
                  {item.listing.quantity}
                </td>
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
                      <span className="market-table__price-desktop">
                        A convenir
                      </span>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
