import { CheckCircle2, ChevronRight, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'

import type { MarketplaceListingItem } from '../data/cardSelectors'
import { getScryfallCardImage } from '../data/scryfallImages'
import type {
  CardCondition,
  CardLanguage,
  CommunityMember,
} from '../domain/types'

const languageLabels: Record<CardLanguage, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  jp: 'Japonés',
}

const conditionLabels: Record<CardCondition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
}

type MarketplaceReservationSheetProps = {
  item: MarketplaceListingItem
  currentMember: CommunityMember
  onCancelReservation: () => void
  onClose: () => void
  onMemberSelect?: (memberId: string) => void
  onPreview?: () => void
  onReserve: (quantity: number) => void
}

export function MarketplaceReservationSheet({
  item,
  currentMember,
  onCancelReservation,
  onClose,
  onMemberSelect,
  onPreview,
  onReserve,
}: MarketplaceReservationSheetProps) {
  const [quantity, setQuantity] = useState(item.listing.reservedQuantity ?? 1)
  const imageUrl = getScryfallCardImage(item.card.name, item.card.imageUri)
  const isOwner = item.listing.memberId === currentMember.id
  const isReservedByCurrentMember =
    item.listing.status === 'reserved' &&
    item.listing.reservedByMemberId === currentMember.id
  const isReservedByAnotherMember =
    item.listing.status === 'reserved' && !isReservedByCurrentMember

  const image = imageUrl ? (
    <img src={imageUrl} alt="" />
  ) : (
    <span>{item.card.setCode}</span>
  )

  return (
    <div
      className="market-reservation-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-reservation-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="market-reservation-sheet__panel">
        <span className="market-reservation-sheet__handle" aria-hidden="true" />
        <button
          className="market-reservation-sheet__close"
          type="button"
          aria-label="Cerrar oferta"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} />
        </button>

        <div className="market-reservation-sheet__identity">
          {onPreview ? (
            <button
              className="market-reservation-sheet__image"
              type="button"
              aria-label={`Ampliar ${item.card.name}`}
              onClick={onPreview}
            >
              {image}
            </button>
          ) : (
            <div className="market-reservation-sheet__image">{image}</div>
          )}
          <div>
            <span className="page-eyebrow">
              {isReservedByCurrentMember
                ? 'Reserva activa'
                : 'Oferta disponible'}
            </span>
            <h2 id="market-reservation-title">{item.card.name}</h2>
            <p>
              {item.card.setName} · #{item.card.collectorNumber}
              {item.listing.finish === 'foil' ? ' · Foil' : ''}
            </p>
            {onMemberSelect ? (
              <button
                className="market-reservation-sheet__member"
                type="button"
                onClick={() => onMemberSelect(item.member.id)}
              >
                Ver las cartas de {item.member.displayName}
                <ChevronRight aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <dl className="market-reservation-sheet__facts">
          <div>
            <dt>Idioma</dt>
            <dd>{languageLabels[item.listing.language]}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{conditionLabels[item.listing.condition]}</dd>
          </div>
          <div>
            <dt>Disponibles</dt>
            <dd>{item.listing.quantity}</dd>
          </div>
          <div>
            <dt>Precio unitario</dt>
            <dd>
              {item.listing.priceEur
                ? `${item.listing.priceEur.toFixed(2)} €`
                : 'A convenir'}
            </dd>
          </div>
        </dl>

        <footer className="market-reservation-sheet__footer">
          {item.listing.status === 'available' && !isOwner ? (
            <div className="market-reservation-sheet__reservation">
              <label>
                <span>Cantidad a reservar</span>
                <select
                  aria-label="Cantidad a reservar"
                  disabled={item.listing.quantity === 1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                >
                  {Array.from(
                    { length: item.listing.quantity },
                    (_, index) => index + 1,
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="market-reservation-sheet__primary"
                type="button"
                onClick={() => onReserve(quantity)}
              >
                <ShoppingBag aria-hidden="true" size={17} />
                Reservar {quantity > 1 ? `${quantity} cartas` : 'carta'}
              </button>
            </div>
          ) : isReservedByCurrentMember ? (
            <div className="market-reservation-sheet__reserved">
              <p>
                <CheckCircle2 aria-hidden="true" size={17} />
                {item.listing.reservedQuantity ?? 1}{' '}
                {(item.listing.reservedQuantity ?? 1) > 1
                  ? 'cartas reservadas para ti'
                  : 'carta reservada para ti'}
              </p>
              <button type="button" onClick={onCancelReservation}>
                <X aria-hidden="true" size={16} />
                Cancelar reserva
              </button>
            </div>
          ) : (
            <p
              className={`market-reservation-sheet__notice${isOwner ? ' market-reservation-sheet__notice--owner' : ''}`}
            >
              <ShoppingBag aria-hidden="true" size={17} />
              <span>
                <strong>
                  {isOwner ? 'Tu oferta' : 'Oferta no disponible'}
                </strong>
                <small>
                  {isOwner
                    ? 'No puedes reservar tu propia carta.'
                    : isReservedByAnotherMember
                      ? 'Esta carta ya está reservada.'
                      : 'Esta carta ya no está disponible.'}
                </small>
              </span>
            </p>
          )}
        </footer>
      </section>
    </div>
  )
}
