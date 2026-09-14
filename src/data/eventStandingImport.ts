import type { CommunityMember } from '../domain/types'
import type { EventLinkStandingRow } from './eventLinkImport'

export type EventLinkMemberMatch = {
  rowIndex: number
  row: EventLinkStandingRow
  status: 'matched' | 'ambiguous' | 'unmatched'
  suggestedMemberIds: string[]
  memberId?: string
}

export type EventLinkMatchableMember = Pick<
  CommunityMember,
  'displayName' | 'id' | 'status'
>

export function normalizeEventLinkPlayerName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')
}

/**
 * Whether a display name carries anything beyond a first name. EventLink
 * always has the surname, so a single word can never be matched — but some
 * people do go by one name, which is why this only ever feeds a hint and
 * never blocks a member from naming themselves as they wish.
 */
export function hasSurname(displayName: string) {
  return normalizeEventLinkPlayerName(displayName).includes(' ')
}

export function matchEventLinkMembers(
  rows: EventLinkStandingRow[],
  members: EventLinkMatchableMember[],
): EventLinkMemberMatch[] {
  const approvedMembers = members.filter(({ status }) => status === 'approved')
  const membersByName = new Map<string, EventLinkMatchableMember[]>()

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
