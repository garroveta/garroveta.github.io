import type { Card } from '../domain/types'
import type { ParsedCardListItem } from './cardListImport'

export type ResolvedScryfallCard = {
  scryfallId: string
  oracleId?: string
  name: string
  setCode: string
  setName: string
  collectorNumber: string
  imageUri?: string
}

export type CardImportResolution = {
  item: ParsedCardListItem
  status: 'resolved' | 'unresolved'
  card?: ResolvedScryfallCard
}

type ScryfallCardObject = {
  id: string
  oracle_id?: string
  name: string
  set: string
  set_name: string
  collector_number: string
  image_uris?: { normal?: string; large?: string }
  card_faces?: Array<{ image_uris?: { normal?: string; large?: string } }>
}

type ScryfallCollectionResponse = {
  data?: ScryfallCardObject[]
  not_found?: Array<Record<string, unknown>>
}

const SCRYFALL_COLLECTION_SIZE = 75

function batches<T>(items: T[], size: number) {
  const result: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }

  return result
}

function identifierFor(item: ParsedCardListItem) {
  if (item.scryfallId) {
    return { id: item.scryfallId }
  }

  if (item.setCode && item.collectorNumber) {
    return {
      set: item.setCode.toLocaleLowerCase('en'),
      collector_number: item.collectorNumber,
    }
  }

  return { name: item.name }
}

function resolutionKey(identifier: Record<string, unknown>) {
  if (typeof identifier.id === 'string') {
    return `id:${identifier.id.toLocaleLowerCase('en')}`
  }

  if (
    typeof identifier.set === 'string' &&
    typeof identifier.collector_number === 'string'
  ) {
    return `printing:${identifier.set.toLocaleLowerCase('en')}:${identifier.collector_number.toLocaleLowerCase('en')}`
  }

  return `name:${String(identifier.name ?? '').toLocaleLowerCase('en')}`
}

function keysForCard(card: ScryfallCardObject) {
  return [
    `id:${card.id.toLocaleLowerCase('en')}`,
    `printing:${card.set.toLocaleLowerCase('en')}:${card.collector_number.toLocaleLowerCase('en')}`,
    `name:${card.name.toLocaleLowerCase('en')}`,
  ]
}

function normalizeCard(card: ScryfallCardObject): ResolvedScryfallCard {
  const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris

  return {
    scryfallId: card.id,
    oracleId: card.oracle_id,
    name: card.name,
    setCode: card.set.toUpperCase(),
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUri: imageUris?.large ?? imageUris?.normal,
  }
}

export async function resolveCardImportItems(
  items: ParsedCardListItem[],
  fetcher: typeof fetch = fetch,
): Promise<CardImportResolution[]> {
  const identifiersByKey = new Map<string, Record<string, unknown>>()

  items.forEach((item) => {
    const identifier = identifierFor(item)
    identifiersByKey.set(resolutionKey(identifier), identifier)
  })

  const cardsByKey = new Map<string, ResolvedScryfallCard>()

  for (const identifierBatch of batches(
    [...identifiersByKey.values()],
    SCRYFALL_COLLECTION_SIZE,
  )) {
    const response = await fetcher(
      'https://api.scryfall.com/cards/collection',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json;q=0.9,*/*;q=0.8',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifiers: identifierBatch }),
      },
    )

    if (!response.ok) {
      throw new Error(`Scryfall a répondu avec le statut ${response.status}.`)
    }

    const payload = (await response.json()) as ScryfallCollectionResponse

    for (const card of payload.data ?? []) {
      const normalizedCard = normalizeCard(card)
      keysForCard(card).forEach((key) => cardsByKey.set(key, normalizedCard))
    }
  }

  return items.map((item) => {
    const key = resolutionKey(identifierFor(item))
    const card = cardsByKey.get(key)

    return card
      ? { item, status: 'resolved' as const, card }
      : { item, status: 'unresolved' as const }
  })
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en')
}

function resolveFromCatalog(item: ParsedCardListItem, cards: Card[]) {
  const card = item.scryfallId
    ? cards.find(({ scryfallId }) => scryfallId === item.scryfallId)
    : item.setCode && item.collectorNumber
      ? cards.find(
          ({ setCode, collectorNumber }) =>
            setCode.toLocaleLowerCase('en') ===
              item.setCode?.toLocaleLowerCase('en') &&
            collectorNumber.toLocaleLowerCase('en') ===
              item.collectorNumber?.toLocaleLowerCase('en'),
        )
      : cards.find(
          ({ name }) => normalizeName(name) === normalizeName(item.name),
        )

  return card
    ? {
        scryfallId: card.scryfallId ?? `local:${card.id}`,
        oracleId: card.oracleId,
        name: card.name,
        setCode: card.setCode,
        setName: card.setName,
        collectorNumber: card.collectorNumber,
        imageUri: card.imageUri,
      }
    : undefined
}

export async function resolveCardImportItemsWithCatalog(
  items: ParsedCardListItem[],
  cards: Card[],
  fetcher: typeof fetch = fetch,
): Promise<CardImportResolution[]> {
  const localResolutions = items.map((item) => resolveFromCatalog(item, cards))
  const unresolvedItems = items.filter((_, index) => !localResolutions[index])
  const remoteResolutions = unresolvedItems.length
    ? await resolveCardImportItems(unresolvedItems, fetcher)
    : []
  let remoteIndex = 0

  return items.map((item, index) => {
    const localCard = localResolutions[index]

    if (localCard) {
      return { item, status: 'resolved' as const, card: localCard }
    }

    const resolution = remoteResolutions[remoteIndex]
    remoteIndex += 1
    return resolution ?? { item, status: 'unresolved' as const }
  })
}
