import type { WantedImportItem } from './cardMutations'
import {
  cardConditionLabels,
  cardLanguageLabels,
  formatMarketplacePrice,
} from './cardPresentation'

export function formatImportedCardsForWhatsApp({
  cards,
  communityName,
  destination,
  memberName,
  offersUrl,
}: {
  cards: WantedImportItem[]
  communityName: string
  destination: 'wanted' | 'offers'
  memberName: string
  offersUrl?: string
}) {
  const title =
    destination === 'offers'
      ? `🃏 *Nuevas cartas disponibles de ${memberName}*`
      : `🔎 *Nuevas cartas buscadas por ${memberName}*`
  const cardLines = cards.map((card) => {
    const edition = `${card.setCode.toLocaleUpperCase('es')}${
      card.collectorNumber ? ` #${card.collectorNumber}` : ''
    }`
    const details = [
      edition,
      cardLanguageLabels[card.language],
      card.condition ? cardConditionLabels[card.condition] : undefined,
      card.finish === 'foil' ? 'Foil' : undefined,
      destination === 'offers'
        ? formatMarketplacePrice(card.priceEur)
        : undefined,
    ].filter(Boolean)

    return `• ${card.quantity}× ${card.cardName} · ${details.join(' · ')}`
  })

  return [
    title,
    ...cardLines,
    `📍 ${communityName}`,
    destination === 'offers' && offersUrl
      ? `🔗 Ver ofertas: ${offersUrl}`
      : undefined,
  ]
    .filter(Boolean)
    .join('\n')
}
