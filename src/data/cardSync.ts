import type {
  DemoDataSet,
  MarketplaceListing,
  PersonalCardList,
} from '../domain/types'
import type { CardListSection } from './cardListImport'
import type { CardImportResolution } from './scryfallClient'
import {
  findExactCatalogCard,
  normalizeCardName,
  type MarketplaceImportItemInput,
} from './cardMutations'

/**
 * A sync always runs inside one personal list: a member usually exports only
 * part of their stock, so a whole-inventory sync would withdraw everything the
 * file does not mention.
 */
export type MarketplaceSyncScope = {
  memberId: string
  cardListId: string
  includedSections: CardListSection[]
}

/** One import line, after the duplicates of the file itself have been merged. */
export type MarketplaceSyncLine = {
  resolution: CardImportResolution & {
    card: NonNullable<CardImportResolution['card']>
  }
  /** Undefined while the printing is still absent from the catalogue. */
  cardId?: string
  cardName: string
  language: MarketplaceListing['language']
  condition: MarketplaceListing['condition']
  finish: MarketplaceListing['finish']
  quantity: number
  priceEur?: number
  /** Every distinct price the merged lines carried, to settle an ambiguity. */
  candidatePrices: number[]
  lineNumbers: number[]
}

export type MarketplaceSyncUpdate = {
  line: MarketplaceSyncLine
  listing: MarketplaceListing
  quantity?: { from: number; to: number }
  price?: { from?: number; to?: number }
  /** The offer had been withdrawn and the file puts it back on sale. */
  republished: boolean
}

export type MarketplaceSyncConflict = {
  line: MarketplaceSyncLine
  listings: MarketplaceListing[]
  /**
   * `duplicate_listings`: several offers answer the same line.
   * `ambiguous_price`: the merged lines disagreed on the price.
   */
  reason: 'duplicate_listings' | 'ambiguous_price'
}

export type MarketplaceSyncProtection = {
  listing: MarketplaceListing
  /**
   * `unresolved_line`: the file does name this card, but Scryfall could not
   * resolve the line, so the offer must not be withdrawn on that basis.
   */
  reason: 'reserved' | 'completed' | 'unresolved_line'
}

export type MarketplaceSyncPlan = {
  added: MarketplaceSyncLine[]
  updated: MarketplaceSyncUpdate[]
  withdrawn: MarketplaceListing[]
  conflicts: MarketplaceSyncConflict[]
  protectedListings: MarketplaceSyncProtection[]
  unresolvedLines: CardImportResolution[]
  unchanged: number
}

const emptyPlan: MarketplaceSyncPlan = {
  added: [],
  updated: [],
  withdrawn: [],
  conflicts: [],
  protectedListings: [],
  unresolvedLines: [],
  unchanged: 0,
}

function variantKey(
  cardKey: string,
  language: MarketplaceListing['language'],
  condition: MarketplaceListing['condition'],
  finish: MarketplaceListing['finish'],
) {
  return `${cardKey}|${language}|${condition}|${finish}`
}

function roundedPrice(priceEur?: number) {
  return priceEur && priceEur > 0 ? Math.round(priceEur * 100) / 100 : undefined
}

function findScope(data: DemoDataSet, scope: MarketplaceSyncScope) {
  const member = data.members.find(({ id }) => id === scope.memberId)
  const cardList = data.cardLists.find(
    ({ id, memberId, kind }) =>
      id === scope.cardListId &&
      memberId === scope.memberId &&
      kind === 'offers',
  )

  return member?.status === 'approved' && cardList
    ? ({ cardList } as { cardList: PersonalCardList })
    : undefined
}

/** Merges the lines of the file that describe the very same offer. */
function mergeImportLines(
  data: DemoDataSet,
  scope: MarketplaceSyncScope,
  items: MarketplaceImportItemInput[],
) {
  const includedSections = new Set(scope.includedSections)
  const unresolvedLines: CardImportResolution[] = []
  const linesByKey = new Map<string, MarketplaceSyncLine>()

  for (const input of items) {
    const { resolution } = input

    if (!includedSections.has(resolution.item.section)) {
      continue
    }

    const resolvedCard = resolution.card

    if (resolution.status !== 'resolved' || !resolvedCard) {
      unresolvedLines.push(resolution)
      continue
    }

    const quantity = Math.floor(input.quantity)

    if (quantity < 1) {
      continue
    }

    const catalogCard = findExactCatalogCard(data.cards, resolvedCard)
    const cardKey = catalogCard?.id ?? `scryfall:${resolvedCard.scryfallId}`
    const key = variantKey(
      cardKey,
      input.language,
      input.condition,
      input.finish,
    )
    const price = roundedPrice(input.priceEur)
    const existing = linesByKey.get(key)

    if (!existing) {
      linesByKey.set(key, {
        resolution: { ...resolution, card: resolvedCard },
        cardId: catalogCard?.id,
        cardName: resolvedCard.name,
        language: input.language,
        condition: input.condition,
        finish: input.finish,
        quantity,
        priceEur: price,
        candidatePrices: price === undefined ? [] : [price],
        lineNumbers: [resolution.item.lineNumber],
      })
      continue
    }

    existing.quantity += quantity
    existing.lineNumbers.push(resolution.item.lineNumber)

    if (price !== undefined && !existing.candidatePrices.includes(price)) {
      existing.candidatePrices.push(price)
    }

    existing.priceEur = existing.candidatePrices[0]
  }

  return { lines: [...linesByKey.values()], unresolvedLines }
}

/**
 * Describes what a sync would change, without changing anything. Nothing is
 * ever applied silently: the caller reviews the plan, settles the conflicts and
 * only then applies it.
 */
export function computeMarketplaceSyncPlan(
  data: DemoDataSet,
  scope: MarketplaceSyncScope,
  items: MarketplaceImportItemInput[],
): MarketplaceSyncPlan {
  if (!findScope(data, scope)) {
    return emptyPlan
  }

  const { lines, unresolvedLines } = mergeImportLines(data, scope, items)
  const scopeListings = data.listings.filter(
    ({ memberId, cardListId }) =>
      memberId === scope.memberId && cardListId === scope.cardListId,
  )
  const listingsByKey = new Map<string, MarketplaceListing[]>()

  for (const listing of scopeListings) {
    const key = variantKey(
      listing.cardId,
      listing.language,
      listing.condition,
      listing.finish,
    )
    listingsByKey.set(key, [...(listingsByKey.get(key) ?? []), listing])
  }

  const unresolvedNames = new Set(
    unresolvedLines.map(({ item }) => normalizeCardName(item.name)),
  )
  const cardNamesById = new Map(data.cards.map(({ id, name }) => [id, name]))
  const plan: MarketplaceSyncPlan = {
    added: [],
    updated: [],
    withdrawn: [],
    conflicts: [],
    protectedListings: [],
    unresolvedLines,
    unchanged: 0,
  }
  const matchedListingIds = new Set<string>()

  for (const line of lines) {
    const key = line.cardId
      ? variantKey(line.cardId, line.language, line.condition, line.finish)
      : undefined
    const candidates = (key ? (listingsByKey.get(key) ?? []) : []).filter(
      ({ status }) => status === 'available' || status === 'withdrawn',
    )

    candidates.forEach(({ id }) => matchedListingIds.add(id))

    if (candidates.length > 1) {
      plan.conflicts.push({
        line,
        listings: candidates,
        reason: 'duplicate_listings',
      })
      continue
    }

    if (line.candidatePrices.length > 1) {
      plan.conflicts.push({
        line,
        listings: candidates,
        reason: 'ambiguous_price',
      })
      continue
    }

    const listing = candidates[0]

    if (!listing) {
      plan.added.push(line)
      continue
    }

    const republished = listing.status === 'withdrawn'
    const quantity =
      listing.quantity === line.quantity
        ? undefined
        : { from: listing.quantity, to: line.quantity }
    // A file without prices never erases a price typed by hand.
    const price =
      line.priceEur === undefined || line.priceEur === listing.priceEur
        ? undefined
        : { from: listing.priceEur, to: line.priceEur }

    if (!republished && !quantity && !price) {
      plan.unchanged += 1
      continue
    }

    plan.updated.push({ line, listing, quantity, price, republished })
  }

  for (const listing of scopeListings) {
    if (matchedListingIds.has(listing.id)) {
      continue
    }

    if (listing.status === 'reserved' || listing.status === 'completed') {
      plan.protectedListings.push({ listing, reason: listing.status })
      continue
    }

    if (listing.status === 'withdrawn') {
      plan.unchanged += 1
      continue
    }

    const listingName = cardNamesById.get(listing.cardId)

    if (listingName && unresolvedNames.has(normalizeCardName(listingName))) {
      plan.protectedListings.push({ listing, reason: 'unresolved_line' })
      continue
    }

    plan.withdrawn.push(listing)
  }

  return plan
}
