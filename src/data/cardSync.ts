import type {
  DemoDataSet,
  MarketplaceListing,
  PersonalCardList,
} from '../domain/types'
import type { CardListSection } from './cardListImport'
import type { CardImportResolution } from './scryfallClient'
import {
  ensureResolvedCard,
  findExactCatalogCard,
  nextUniqueId,
  normalizeCardName,
  type MarketplaceImportItemInput,
} from './cardMutations'
import { synchronizeCardMatches } from './cardMatching'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

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
  /** Stable identity of the variant, used to address a conflict. */
  key: string
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
  sections: CardListSection[],
  items: MarketplaceImportItemInput[],
) {
  const includedSections = new Set(sections)
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
        key,
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

/** Returns what the file changes for one offer, or undefined when nothing does. */
function buildUpdate(
  line: MarketplaceSyncLine,
  listing: MarketplaceListing,
): MarketplaceSyncUpdate | undefined {
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

  return !republished && !quantity && !price
    ? undefined
    : { line, listing, quantity, price, republished }
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

  const { lines, unresolvedLines } = mergeImportLines(
    data,
    scope.includedSections,
    items,
  )
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

    const update = buildUpdate(line, listing)

    if (!update) {
      plan.unchanged += 1
      continue
    }

    plan.updated.push(update)
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

export type MarketplaceSyncConflictChoice =
  /** Settle the line: `listingId` picks the offer to keep, the others go. */
  | { kind: 'apply'; listingId?: string; quantity: number; priceEur?: number }
  /** Leave every offer of the line untouched. */
  | { kind: 'skip' }

/**
 * Turns one settled conflict into ordinary plan entries. A plan can only be
 * applied once every conflict has gone through here.
 */
export function resolveMarketplaceSyncConflict(
  plan: MarketplaceSyncPlan,
  lineKey: string,
  choice: MarketplaceSyncConflictChoice,
): MarketplaceSyncPlan {
  const conflict = plan.conflicts.find(({ line }) => line.key === lineKey)

  if (!conflict) {
    return plan
  }

  const conflicts = plan.conflicts.filter(({ line }) => line.key !== lineKey)

  if (choice.kind === 'skip') {
    return {
      ...plan,
      conflicts,
      unchanged: plan.unchanged + conflict.listings.length,
    }
  }

  const line: MarketplaceSyncLine = {
    ...conflict.line,
    quantity: choice.quantity,
    priceEur: roundedPrice(choice.priceEur),
    candidatePrices:
      roundedPrice(choice.priceEur) === undefined
        ? []
        : [roundedPrice(choice.priceEur)!],
  }
  const kept = choice.listingId
    ? conflict.listings.find(({ id }) => id === choice.listingId)
    : undefined
  const dropped = conflict.listings.filter(({ id }) => id !== kept?.id)

  if (!kept) {
    return {
      ...plan,
      conflicts,
      added: [...plan.added, line],
      withdrawn: [...plan.withdrawn, ...dropped],
    }
  }

  const update = buildUpdate(line, kept)

  return {
    ...plan,
    conflicts,
    updated: update ? [...plan.updated, update] : plan.updated,
    withdrawn: [...plan.withdrawn, ...dropped],
    unchanged: update ? plan.unchanged : plan.unchanged + 1,
  }
}

export type MarketplaceSyncResult = {
  data: DemoDataSet
  added: number
  updated: number
  withdrawn: number
  /** Offers the plan expected in another state, left untouched. */
  skipped: MarketplaceListing[]
}

/**
 * Applies a settled plan. Every offer is re-read from the data first: one whose
 * state moved since the plan was computed — a reservation arriving meanwhile —
 * is reported rather than overwritten.
 */
export function applyMarketplaceSyncPlan(
  data: DemoDataSet,
  scope: MarketplaceSyncScope,
  plan: MarketplaceSyncPlan,
  appliedAt = DEMO_REFERENCE_TIME,
): MarketplaceSyncResult {
  const emptyResult = { data, added: 0, updated: 0, withdrawn: 0, skipped: [] }

  if (plan.conflicts.length > 0 || !findScope(data, scope)) {
    return emptyResult
  }

  const currentById = new Map(
    data.listings.map((listing) => [listing.id, listing]),
  )
  const changes = new Map<string, MarketplaceListing>()
  const skipped: MarketplaceListing[] = []
  let updated = 0
  let withdrawn = 0

  const claim = (
    listing: MarketplaceListing,
    expectedStatus: MarketplaceListing['status'],
  ) => {
    const current = currentById.get(listing.id)

    if (
      !current ||
      current.memberId !== scope.memberId ||
      current.cardListId !== scope.cardListId ||
      current.status !== expectedStatus ||
      changes.has(current.id)
    ) {
      if (current) {
        skipped.push(current)
      }

      return undefined
    }

    return current
  }

  for (const update of plan.updated) {
    const current = claim(update.listing, update.listing.status)

    if (!current) {
      continue
    }

    changes.set(current.id, {
      ...current,
      quantity: update.quantity?.to ?? current.quantity,
      priceEur: update.price ? update.price.to : current.priceEur,
      status: update.republished ? 'available' : current.status,
    })
    updated += 1
  }

  for (const listing of plan.withdrawn) {
    const current = claim(listing, 'available')

    if (!current) {
      continue
    }

    changes.set(current.id, { ...current, status: 'withdrawn' })
    withdrawn += 1
  }

  let cards = [...data.cards]
  const createdListings: MarketplaceListing[] = []
  const usedIds = data.listings.map(({ id }) => id)

  for (const line of plan.added) {
    const ensured = ensureResolvedCard(cards, line.resolution.card, false)
    cards = ensured.cards

    const id = nextUniqueId(
      usedIds,
      `listing-${scope.memberId.replace('member-', '')}-${ensured.cardId.replace('card-', '')}`,
    )
    usedIds.push(id)
    createdListings.push({
      id,
      communityId: data.community.id,
      memberId: scope.memberId,
      cardId: ensured.cardId,
      cardListId: scope.cardListId,
      quantity: line.quantity,
      language: line.language,
      condition: line.condition,
      finish: line.finish,
      offerType: 'sale',
      priceEur: line.priceEur,
      status: 'available',
      createdAt: appliedAt,
    })
  }

  return {
    data: synchronizeCardMatches({
      ...data,
      cards,
      listings: [
        ...data.listings.map((listing) => changes.get(listing.id) ?? listing),
        ...createdListings,
      ],
    }),
    added: createdListings.length,
    updated,
    withdrawn,
    skipped,
  }
}

export type MarketplaceImportOverlap = {
  /** Lines of the file that already match an offer of this member. */
  matchedLines: number
  totalLines: number
  /** Private lists holding those offers, to suggest what to synchronise. */
  cardListIds: string[]
}

/**
 * Tells how much of an import the member already offers, so that adding does
 * not silently duplicate a stock they simply exported again. Unlike a file
 * fingerprint, this still recognises a file that was edited between exports.
 */
export function findMarketplaceImportOverlap(
  data: DemoDataSet,
  memberId: string,
  items: MarketplaceImportItemInput[],
  sections: CardListSection[],
): MarketplaceImportOverlap {
  const { lines } = mergeImportLines(data, sections, items)
  const listingsByKey = new Map<string, MarketplaceListing[]>()

  data.listings
    .filter(
      (listing) =>
        listing.memberId === memberId && listing.status !== 'completed',
    )
    .forEach((listing) => {
      const key = variantKey(
        listing.cardId,
        listing.language,
        listing.condition,
        listing.finish,
      )
      listingsByKey.set(key, [...(listingsByKey.get(key) ?? []), listing])
    })

  const cardListIds = new Set<string>()
  let matchedLines = 0

  for (const line of lines) {
    const matches = line.cardId ? (listingsByKey.get(line.key) ?? []) : []

    if (matches.length === 0) {
      continue
    }

    matchedLines += 1
    matches.forEach(({ cardListId }) => {
      if (cardListId) {
        cardListIds.add(cardListId)
      }
    })
  }

  return {
    matchedLines,
    totalLines: lines.length,
    cardListIds: [...cardListIds],
  }
}
