import type {
  CardCondition,
  CardLanguage,
  DemoDataSet,
  MarketplaceListing,
} from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type MarketplaceListingInput = {
  memberId: string
  cardId: string
  quantity: number
  language: CardLanguage
  condition: CardCondition
  finish: MarketplaceListing['finish']
  offerType: MarketplaceListing['offerType']
  priceEur?: number
}

export type WantedImportItem = {
  cardId: string
  cardName: string
  quantity: number
}

export type WantedImportResult = {
  data: DemoDataSet
  imported: WantedImportItem[]
  unknownLines: string[]
}

function normalizeCardName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en')
}

function nextUniqueId(dataIds: string[], baseId: string) {
  let candidateId = baseId
  let suffix = 2

  while (dataIds.includes(candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

function parseImportLine(line: string) {
  const leadingQuantity = line.match(/^(\d+)\s*x?\s+(.+)$/i)

  if (leadingQuantity) {
    return {
      quantity: Number(leadingQuantity[1]),
      cardName: leadingQuantity[2].trim(),
    }
  }

  const trailingQuantity = line.match(/^(.+?)\s+x(\d+)$/i)

  if (trailingQuantity) {
    return {
      quantity: Number(trailingQuantity[2]),
      cardName: trailingQuantity[1].trim(),
    }
  }

  return {
    quantity: 1,
    cardName: line.trim(),
  }
}

export function publishMarketplaceListing(
  data: DemoDataSet,
  input: MarketplaceListingInput,
  createdAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === input.memberId)
  const card = data.cards.find(({ id }) => id === input.cardId)
  const quantity = Math.floor(input.quantity)
  const priceEur =
    input.priceEur && input.priceEur > 0
      ? Math.round(input.priceEur * 100) / 100
      : undefined

  if (!member || member.status !== 'approved' || !card || quantity < 1) {
    return data
  }

  const listingId = nextUniqueId(
    data.listings.map(({ id }) => id),
    `listing-${member.id.replace('member-', '')}-${card.id.replace('card-', '')}`,
  )

  return {
    ...data,
    listings: [
      ...data.listings,
      {
        id: listingId,
        communityId: data.community.id,
        memberId: member.id,
        cardId: card.id,
        quantity,
        language: input.language,
        condition: input.condition,
        finish: input.finish,
        offerType: input.offerType,
        priceEur,
        status: 'available',
        createdAt,
      },
    ],
  }
}

export function importWantedCards(
  data: DemoDataSet,
  memberId: string,
  rawList: string,
  createdAt = DEMO_REFERENCE_TIME,
): WantedImportResult {
  const member = data.members.find(({ id }) => id === memberId)
  const cardsByName = new Map(
    data.cards.map((card) => [normalizeCardName(card.name), card]),
  )
  const importedByCardId = new Map<string, WantedImportItem>()
  const unknownLines: string[] = []

  for (const rawLine of rawList.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const parsedLine = parseImportLine(line)
    const card = cardsByName.get(normalizeCardName(parsedLine.cardName))

    if (!card || parsedLine.quantity < 1) {
      unknownLines.push(line)
      continue
    }

    const currentItem = importedByCardId.get(card.id)
    importedByCardId.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      quantity: (currentItem?.quantity ?? 0) + parsedLine.quantity,
    })
  }

  const imported = [...importedByCardId.values()]

  if (!member || member.status !== 'approved' || imported.length === 0) {
    return { data, imported: [], unknownLines }
  }

  let wantedCards = [...data.wantedCards]

  for (const item of imported) {
    const existingWantedCard = wantedCards.find(
      (wantedCard) =>
        wantedCard.memberId === memberId &&
        wantedCard.cardId === item.cardId &&
        wantedCard.status !== 'fulfilled',
    )

    if (existingWantedCard) {
      wantedCards = wantedCards.map((wantedCard) =>
        wantedCard.id === existingWantedCard.id
          ? {
              ...wantedCard,
              quantity: wantedCard.quantity + item.quantity,
              status: 'active' as const,
            }
          : wantedCard,
      )
      continue
    }

    const wantedCardId = nextUniqueId(
      wantedCards.map(({ id }) => id),
      `wanted-${member.id.replace('member-', '')}-${item.cardId.replace('card-', '')}`,
    )

    wantedCards.push({
      id: wantedCardId,
      communityId: data.community.id,
      memberId,
      cardId: item.cardId,
      quantity: item.quantity,
      acceptedLanguages: ['es', 'en'],
      acceptedFinishes: ['nonfoil'],
      status: 'active',
      createdAt,
    })
  }

  return {
    data: {
      ...data,
      wantedCards,
    },
    imported,
    unknownLines,
  }
}
