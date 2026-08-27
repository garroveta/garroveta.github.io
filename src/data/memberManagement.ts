import type {
  CommunityMember,
  CommunityRole,
  DemoDataSet,
} from '../domain/types'
import { isCommunityOptionActive } from './communityOptions'

function isApprovedManager(data: DemoDataSet, managerId: string) {
  return data.members.some(
    ({ id, role, status }) =>
      id === managerId && role === 'manager' && status === 'approved',
  )
}

export function approveMember(
  data: DemoDataSet,
  memberId: string,
  managerId: string,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)

  if (
    !isApprovedManager(data, managerId) ||
    !member ||
    member.status !== 'pending'
  ) {
    return data
  }

  return {
    ...data,
    community: {
      ...data.community,
      memberCount: data.community.memberCount + 1,
    },
    members: data.members.map((candidate) =>
      candidate.id === memberId
        ? { ...candidate, status: 'approved' as const }
        : candidate,
    ),
  }
}

export function rejectPendingMember(
  data: DemoDataSet,
  memberId: string,
  managerId: string,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)

  if (
    !isApprovedManager(data, managerId) ||
    !member ||
    member.status !== 'pending'
  ) {
    return data
  }

  return {
    ...data,
    members: data.members.filter(({ id }) => id !== memberId),
  }
}

export function updateMemberRole(
  data: DemoDataSet,
  memberId: string,
  managerId: string,
  role: CommunityRole,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)

  if (
    !isApprovedManager(data, managerId) ||
    !member ||
    member.status === 'pending' ||
    memberId === managerId
  ) {
    return data
  }

  return {
    ...data,
    members: data.members.map((candidate) =>
      candidate.id === memberId ? { ...candidate, role } : candidate,
    ),
  }
}

export function updateMemberTags(
  data: DemoDataSet,
  memberId: string,
  managerId: string,
  tagIds: string[],
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)

  if (!isApprovedManager(data, managerId) || !member) {
    return data
  }

  const validTagIds = new Set(
    data.tags.filter(isCommunityOptionActive).map(({ id }) => id),
  )
  const nextTagIds = [...new Set(tagIds)].filter((tagId) =>
    validTagIds.has(tagId),
  )

  return {
    ...data,
    members: data.members.map((candidate) =>
      candidate.id === memberId
        ? { ...candidate, tagIds: nextTagIds }
        : candidate,
    ),
  }
}

export function setMemberSuspended(
  data: DemoDataSet,
  memberId: string,
  managerId: string,
  suspended: boolean,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)
  const expectedStatus: CommunityMember['status'] = suspended
    ? 'approved'
    : 'suspended'

  if (
    !isApprovedManager(data, managerId) ||
    !member ||
    member.id === managerId ||
    member.status !== expectedStatus
  ) {
    return data
  }

  return {
    ...data,
    members: data.members.map((candidate) =>
      candidate.id === memberId
        ? {
            ...candidate,
            status: suspended ? ('suspended' as const) : ('approved' as const),
          }
        : candidate,
    ),
  }
}
