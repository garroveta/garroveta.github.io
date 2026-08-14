import { CheckCircle2, ChevronRight, ShoppingBag, X } from 'lucide-react'

import type { MarketplaceListingItem } from '../data/cardSelectors'

type MarketplaceListingActionProps = {
  currentMemberId: string
  item: MarketplaceListingItem
  onOpen: (item: MarketplaceListingItem) => void
  ownerMode?: 'open' | 'status'
}

export function MarketplaceListingAction({
  currentMemberId,
  item,
  onOpen,
  ownerMode = 'open',
}: MarketplaceListingActionProps) {
  const { card, listing, member } = item
  const isOwner = listing.memberId === currentMemberId
  const isReservedByCurrentMember =
    listing.reservedByMemberId === currentMemberId

  if (isOwner && ownerMode === 'status') {
    return (
      <span className={`listing-status listing-status--${listing.status}`}>
        {listing.status === 'reserved' ? 'Reservada' : 'Disponible'}
      </span>
    )
  }

  if (listing.status === 'reserved' && !isOwner) {
    if (!isReservedByCurrentMember) {
      return (
        <span className="market-listing-action__status">
          <CheckCircle2 aria-hidden="true" size={13} />
          <span>Reservada</span>
        </span>
      )
    }

    return (
      <button
        className="market-listing-action market-listing-action--cancel"
        type="button"
        aria-label={`Cancelar reserva de ${card.name}`}
        title="Cancelar reserva"
        onClick={() => onOpen(item)}
      >
        <X aria-hidden="true" size={13} />
        <span>Cancelar</span>
      </button>
    )
  }

  return (
    <button
      className="market-listing-action"
      type="button"
      aria-label={
        isOwner
          ? `Ver oferta de ${card.name}`
          : `Reservar ${card.name} de ${member.displayName}`
      }
      title={isOwner ? 'Ver oferta' : 'Reservar'}
      onClick={() => onOpen(item)}
    >
      {isOwner ? (
        <ChevronRight aria-hidden="true" size={13} />
      ) : (
        <ShoppingBag aria-hidden="true" size={13} />
      )}
      <span>{isOwner ? 'Ver' : 'Reservar'}</span>
    </button>
  )
}
