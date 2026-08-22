import type {
  CommunityMember,
  DemoDataSet,
  EventStandingEntry,
} from '../domain/types'
import type {
  EventLinkStandingRow,
  ParsedEventLinkStanding,
} from './eventLinkImport'

export type EventLinkMemberMatch = {
  rowIndex: number
  row: EventLinkStandingRow
  status: 'matched' | 'ambiguous' | 'unmatched'
  suggestedMemberIds: string[]
  memberId?: string
}

export type SaveEventLinkStandingInput = {
  eventId: string
  managerId: string
  parsedStanding: ParsedEventLinkStanding
  memberIdsByRow: Array<string | undefined>
  countsForCommunityRanking: boolean
  importedAt?: string
}

export function normalizeEventLinkPlayerName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')
}

export function matchEventLinkMembers(
  rows: EventLinkStandingRow[],
  members: CommunityMember[],
): EventLinkMemberMatch[] {
  const approvedMembers = members.filter(({ status }) => status === 'approved')
  const membersByName = new Map<string, CommunityMember[]>()

  for (const member of approvedMembers) {
    const normalizedName = normalizeEventLinkPlayerName(member.displayName)
    const current = membersByName.get(normalizedName) ?? []
    membersByName.set(normalizedName, [...current, member])
  }

  return rows.map((row, rowIndex) => {
    const matches =
      membersByName.get(normalizeEventLinkPlayerName(row.displayName)) ?? []
    const suggestedMemberIds = matches.map(({ id }) => id)

    return {
      rowIndex,
      row,
      status:
        matches.length === 1
          ? 'matched'
          : matches.length > 1
            ? 'ambiguous'
            : 'unmatched',
      suggestedMemberIds,
      memberId: matches.length === 1 ? matches[0].id : undefined,
    }
  })
}

function buildStandingEntry(
  row: EventLinkStandingRow,
  memberId?: string,
): EventStandingEntry {
  return {
    ...row,
    memberId,
  }
}

export function saveEventLinkStanding(
  data: DemoDataSet,
  input: SaveEventLinkStandingInput,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role, status }) =>
      id === input.managerId && role === 'manager' && status === 'approved',
  )
  const event = data.events.find(({ id }) => id === input.eventId)
  const validMembers = new Set(
    data.members
      .filter(({ status }) => status === 'approved')
      .map(({ id }) => id),
  )
  const assignedMemberIds = input.memberIdsByRow.filter(
    (memberId): memberId is string => Boolean(memberId),
  )

  if (
    !manager ||
    !event ||
    event.gameId !== 'game-mtg' ||
    input.parsedStanding.rows.length === 0 ||
    input.memberIdsByRow.length !== input.parsedStanding.rows.length ||
    assignedMemberIds.some((memberId) => !validMembers.has(memberId)) ||
    new Set(assignedMemberIds).size !== assignedMemberIds.length
  ) {
    return data
  }

  const existingStanding = data.eventStandings.find(
    ({ eventId }) => eventId === event.id,
  )
  const importedAt = input.importedAt ?? new Date().toISOString()
  const standing = {
    id: existingStanding?.id ?? `standing-${event.id}`,
    eventId: event.id,
    entries: input.parsedStanding.rows.map((row, index) =>
      buildStandingEntry(row, input.memberIdsByRow[index]),
    ),
    source: {
      kind: 'eventlink_html' as const,
      storeId: input.parsedStanding.storeId,
      externalEventId: input.parsedStanding.externalEventId,
      roundNumber: input.parsedStanding.roundNumber,
      importedAt,
    },
  }

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === event.id
        ? {
            ...candidate,
            status: 'completed' as const,
            countsForCommunityRanking: input.countsForCommunityRanking,
          }
        : candidate,
    ),
    eventStandings: existingStanding
      ? data.eventStandings.map((candidate) =>
          candidate.eventId === event.id ? standing : candidate,
        )
      : [...data.eventStandings, standing],
  }
}
