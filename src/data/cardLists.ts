import type { DemoDataSet, PersonalCardList } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function nextListId(data: DemoDataSet, memberId: string, name: string) {
  const baseId = `card-list-${memberId.replace('member-', '')}-${slugify(name) || 'lista'}`
  let id = baseId
  let suffix = 2

  while (data.cardLists.some((list) => list.id === id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  return id
}

export function createPersonalCardList(
  data: DemoDataSet,
  memberId: string,
  name: string,
  kind: PersonalCardList['kind'],
  createdAt = DEMO_REFERENCE_TIME,
): { data: DemoDataSet; list?: PersonalCardList } {
  const member = data.members.find(({ id }) => id === memberId)
  const normalizedName = name.trim().replace(/\s+/g, ' ')

  if (!member || member.status !== 'approved' || !normalizedName) {
    return { data }
  }

  const list: PersonalCardList = {
    id: nextListId(data, memberId, normalizedName),
    communityId: data.community.id,
    memberId,
    name: normalizedName,
    kind,
    createdAt,
  }

  return { data: { ...data, cardLists: [...data.cardLists, list] }, list }
}

export function renamePersonalCardList(
  data: DemoDataSet,
  memberId: string,
  listId: string,
  name: string,
): DemoDataSet {
  const normalizedName = name.trim().replace(/\s+/g, ' ')
  const list = data.cardLists.find(
    (candidate) => candidate.id === listId && candidate.memberId === memberId,
  )

  if (!list || !normalizedName || list.name === normalizedName) {
    return data
  }

  return {
    ...data,
    cardLists: data.cardLists.map((candidate) =>
      candidate.id === listId
        ? { ...candidate, name: normalizedName }
        : candidate,
    ),
  }
}

export function assignWantedCardToList(
  data: DemoDataSet,
  memberId: string,
  wantedCardId: string,
  cardListId?: string,
): DemoDataSet {
  const wantedCard = data.wantedCards.find(
    (candidate) =>
      candidate.id === wantedCardId && candidate.memberId === memberId,
  )
  const list = cardListId
    ? data.cardLists.find(
        (candidate) =>
          candidate.id === cardListId &&
          candidate.memberId === memberId &&
          candidate.kind === 'wanted',
      )
    : undefined

  if (!wantedCard || (cardListId && !list)) {
    return data
  }

  return {
    ...data,
    wantedCards: data.wantedCards.map((candidate) =>
      candidate.id === wantedCardId
        ? { ...candidate, cardListId: list?.id }
        : candidate,
    ),
  }
}

export function assignListingToList(
  data: DemoDataSet,
  memberId: string,
  listingId: string,
  cardListId?: string,
): DemoDataSet {
  const listing = data.listings.find(
    (candidate) =>
      candidate.id === listingId && candidate.memberId === memberId,
  )
  const list = cardListId
    ? data.cardLists.find(
        (candidate) =>
          candidate.id === cardListId &&
          candidate.memberId === memberId &&
          candidate.kind === 'offers',
      )
    : undefined

  if (!listing || (cardListId && !list)) {
    return data
  }

  return {
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listingId
        ? { ...candidate, cardListId: list?.id }
        : candidate,
    ),
  }
}
