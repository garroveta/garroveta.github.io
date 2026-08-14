import { useMemo, useState } from 'react'

import {
  cancelMarketplaceReservation,
  reserveMarketplaceListing,
} from '../data/cardLifecycle'
import type { MarketplaceListingItem } from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { CommunityMember, DemoDataSet } from '../domain/types'

type MarketplaceReservationOptions = {
  cancellationMessageStyle?: 'generic' | 'named'
  currentMember: CommunityMember
  data: DemoDataSet
  onDataChange: (updater: DemoDataUpdater) => void
  onMessage: (message: string) => void
}

export function useMarketplaceReservation({
  cancellationMessageStyle = 'generic',
  currentMember,
  data,
  onDataChange,
  onMessage,
}: MarketplaceReservationOptions) {
  const [selectedListingId, setSelectedListingId] = useState<string>()
  const selectedItem = useMemo<MarketplaceListingItem | undefined>(() => {
    const listing = data.listings.find(({ id }) => id === selectedListingId)
    const card = listing
      ? data.cards.find(({ id }) => id === listing.cardId)
      : undefined
    const member = listing
      ? data.members.find(({ id }) => id === listing.memberId)
      : undefined

    return listing && card && member ? { listing, card, member } : undefined
  }, [data.cards, data.listings, data.members, selectedListingId])

  const openReservation = (item: { listing: { id: string } }) => {
    setSelectedListingId(item.listing.id)
  }

  const closeReservation = () => setSelectedListingId(undefined)

  const reserveSelected = (quantity: number) => {
    if (!selectedItem) return

    onDataChange((currentData) =>
      reserveMarketplaceListing(
        currentData,
        selectedItem.listing.id,
        currentMember.id,
        undefined,
        quantity,
      ),
    )
    onMessage(
      `${quantity} ${quantity > 1 ? 'cartas reservadas' : 'carta reservada'} a tu nombre.`,
    )
  }

  const cancelSelected = (quantity: number) => {
    if (!selectedItem) return

    const remainingQuantity =
      (selectedItem.listing.reservedQuantity ?? 1) - quantity
    const isOwnedOffer = selectedItem.listing.memberId === currentMember.id

    onDataChange((currentData) =>
      cancelMarketplaceReservation(
        currentData,
        selectedItem.listing.id,
        currentMember.id,
        quantity,
      ),
    )
    onMessage(
      remainingQuantity > 0
        ? `Queda ${remainingQuantity} ${remainingQuantity > 1 ? 'cartas reservadas' : 'carta reservada'}${cancellationMessageStyle === 'named' ? ` de ${selectedItem.card.name}` : ''}.`
        : isOwnedOffer
          ? cancellationMessageStyle === 'named'
            ? `${selectedItem.card.name} vuelve a estar disponible.`
            : 'La carta vuelve a estar disponible.'
          : cancellationMessageStyle === 'named'
            ? `La reserva de ${selectedItem.card.name} se ha cancelado.`
            : 'La reserva se ha cancelado.',
    )
  }

  return {
    cancelSelected,
    closeReservation,
    openReservation,
    reserveSelected,
    selectedItem,
  }
}
