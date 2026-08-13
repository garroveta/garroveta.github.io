import type {
  Card,
  CardCondition,
  CardLanguage,
  DemoDataSet,
  MarketplaceListing,
} from '../domain/types'
import type { CardListSection } from './cardListImport'
import type { CardImportResolution } from './scryfallClient'
import { synchronizeCardMatches } from './cardMatching'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type MarketplaceListingInput = {
  memberId: string
  cardId: string
  cardListId?: string
  quantity: number
  language: CardLanguage
  condition: CardCondition
  finish: MarketplaceListing['finish']
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

export type WantedImportMode = 'add' | 'update' | 'sync'

export type ResolvedWantedImportResult = {
  data: DemoDataSet
  imported: WantedImportItem[]
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

function cardIdFromScryfall(card: NonNullable<CardImportResolution['card']>) {
  return `card-scryfall-${card.scryfallId}`
}

function isScryfallId(value: string) {
  return !value.startsWith('local:')
}

function ensureResolvedCard(
  cards: Card[],
  resolvedCard: NonNullable<CardImportResolution['card']>,
  allowAnyPrinting: boolean,
) {
  const exactCard =
    cards.find(({ scryfallId }) => scryfallId === resolvedCard.scryfallId) ??
    cards.find(
      ({ name, setCode, collectorNumber }) =>
        normalizeCardName(name) === normalizeCardName(resolvedCard.name) &&
        setCode.toLocaleLowerCase('en') ===
          resolvedCard.setCode.toLocaleLowerCase('en') &&
        collectorNumber.toLocaleLowerCase('en') ===
          resolvedCard.collectorNumber.toLocaleLowerCase('en'),
    )
  const existingCard =
    exactCard ??
    (allowAnyPrinting
      ? cards.find(
          ({ name }) =>
            normalizeCardName(name) === normalizeCardName(resolvedCard.name),
        )
      : undefined)

  if (existingCard) {
    return {
      cards: cards.map((card) =>
        card.id === existingCard.id
          ? {
              ...card,
              scryfallId:
                card.scryfallId ??
                (exactCard && isScryfallId(resolvedCard.scryfallId)
                  ? resolvedCard.scryfallId
                  : undefined),
              oracleId: card.oracleId ?? resolvedCard.oracleId,
              imageUri:
                card.imageUri ??
                (exactCard ? resolvedCard.imageUri : undefined),
            }
          : card,
      ),
      cardId: existingCard.id,
    }
  }

  const cardId = cardIdFromScryfall(resolvedCard)

  return {
    cards: [
      ...cards,
      {
        id: cardId,
        name: resolvedCard.name,
        setName: resolvedCard.setName,
        setCode: resolvedCard.setCode,
        collectorNumber: resolvedCard.collectorNumber,
        scryfallId: resolvedCard.scryfallId,
        oracleId: resolvedCard.oracleId,
        imageUri: resolvedCard.imageUri,
      },
    ],
    cardId,
  }
}

export function applyResolvedWantedCardImport(
  data: DemoDataSet,
  memberId: string,
  resolutions: CardImportResolution[],
  mode: WantedImportMode,
  includedSections: CardListSection[],
  matchAllPrintings = true,
  createdAt = DEMO_REFERENCE_TIME,
  cardListId?: string,
): ResolvedWantedImportResult {
  const member = data.members.find(({ id }) => id === memberId)
  const includedSectionSet = new Set(includedSections)
  const resolvedItems = resolutions.filter(
    (
      resolution,
    ): resolution is CardImportResolution & {
      card: NonNullable<CardImportResolution['card']>
    } =>
      resolution.status === 'resolved' &&
      Boolean(resolution.card) &&
      includedSectionSet.has(resolution.item.section),
  )

  if (!member || member.status !== 'approved' || resolvedItems.length === 0) {
    return { data, imported: [] }
  }

  let cards = [...data.cards]
  const importGroups = new Map<
    string,
    {
      cardId: string
      cardName: string
      oracleId?: string
      scryfallId: string
      quantity: number
      section: CardListSection
    }
  >()

  for (const resolution of resolvedItems) {
    const ensuredCard = ensureResolvedCard(
      cards,
      resolution.card,
      matchAllPrintings,
    )
    cards = ensuredCard.cards
    const key =
      (matchAllPrintings && resolution.card.oracleId) ||
      (matchAllPrintings
        ? normalizeCardName(resolution.card.name)
        : resolution.card.scryfallId)
    const currentGroup = importGroups.get(key)

    importGroups.set(key, {
      cardId: currentGroup?.cardId ?? ensuredCard.cardId,
      cardName: resolution.card.name,
      oracleId: resolution.card.oracleId,
      scryfallId: resolution.card.scryfallId,
      quantity: (currentGroup?.quantity ?? 0) + resolution.item.quantity,
      section: currentGroup?.section ?? resolution.item.section,
    })
  }

  const imported = [...importGroups.values()].map(
    ({ cardId, cardName, quantity }) => ({ cardId, cardName, quantity }),
  )
  const importedKeys = new Set(importGroups.keys())
  let wantedCards = data.wantedCards.map((wantedCard) => {
    if (
      mode !== 'sync' ||
      wantedCard.memberId !== memberId ||
      (cardListId !== undefined && wantedCard.cardListId !== cardListId) ||
      wantedCard.status === 'fulfilled'
    ) {
      return wantedCard
    }

    const card = cards.find(({ id }) => id === wantedCard.cardId)
    const key =
      (matchAllPrintings && (wantedCard.oracleId ?? card?.oracleId)) ||
      (matchAllPrintings
        ? normalizeCardName(card?.name ?? '')
        : (wantedCard.requestedScryfallId ??
          card?.scryfallId ??
          card?.id ??
          ''))

    return importedKeys.has(key)
      ? wantedCard
      : { ...wantedCard, status: 'paused' as const }
  })

  for (const [key, item] of importGroups) {
    const existingWantedCard = wantedCards.find((wantedCard) => {
      if (
        wantedCard.memberId !== memberId ||
        wantedCard.status === 'fulfilled'
      ) {
        return false
      }

      const card = cards.find(({ id }) => id === wantedCard.cardId)
      const wantedKey =
        (matchAllPrintings && (wantedCard.oracleId ?? card?.oracleId)) ||
        (matchAllPrintings
          ? normalizeCardName(card?.name ?? '')
          : (wantedCard.requestedScryfallId ??
            card?.scryfallId ??
            card?.id ??
            ''))
      return wantedKey === key
    })

    if (existingWantedCard) {
      wantedCards = wantedCards.map((wantedCard) =>
        wantedCard.id === existingWantedCard.id
          ? {
              ...wantedCard,
              cardId: item.cardId,
              oracleId: item.oracleId,
              requestedScryfallId: matchAllPrintings
                ? undefined
                : item.scryfallId,
              matchAllPrintings,
              importSection: item.section,
              cardListId,
              quantity:
                mode === 'add'
                  ? wantedCard.quantity + item.quantity
                  : item.quantity,
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
      oracleId: item.oracleId,
      requestedScryfallId: matchAllPrintings ? undefined : item.scryfallId,
      matchAllPrintings,
      importSection: item.section,
      cardListId,
      status: 'active',
      createdAt,
    })
  }

  return {
    data: synchronizeCardMatches({ ...data, cards, wantedCards }),
    imported,
  }
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
  const cardList = input.cardListId
    ? data.cardLists.find(
        ({ id, memberId, kind }) =>
          id === input.cardListId &&
          memberId === input.memberId &&
          kind === 'offers',
      )
    : undefined
  const quantity = Math.floor(input.quantity)
  const priceEur =
    input.priceEur && input.priceEur > 0
      ? Math.round(input.priceEur * 100) / 100
      : undefined

  if (
    !member ||
    member.status !== 'approved' ||
    !card ||
    quantity < 1 ||
    (input.cardListId && !cardList)
  ) {
    return data
  }

  const listingId = nextUniqueId(
    data.listings.map(({ id }) => id),
    `listing-${member.id.replace('member-', '')}-${card.id.replace('card-', '')}`,
  )

  return synchronizeCardMatches({
    ...data,
    listings: [
      ...data.listings,
      {
        id: listingId,
        communityId: data.community.id,
        memberId: member.id,
        cardId: card.id,
        cardListId: cardList?.id,
        quantity,
        language: input.language,
        condition: input.condition,
        finish: input.finish,
        offerType: 'sale',
        priceEur,
        status: 'available',
        createdAt,
      },
    ],
  })
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
    data: synchronizeCardMatches({
      ...data,
      wantedCards,
    }),
    imported,
    unknownLines,
  }
}
