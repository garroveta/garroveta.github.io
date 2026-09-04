import type { ManagedCommunityMember } from '../api/managerMembers'
import type { CommunityMember } from '../domain/types'

export function getMemberInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('es')
}

export function toCommunityMember(
  member: ManagedCommunityMember,
  communityId: string,
): CommunityMember {
  return {
    communityId,
    contactMethods: [],
    displayName: member.displayName,
    favoriteGameIds: member.favoriteGameIds,
    id: member.id,
    initials: getMemberInitials(member.displayName),
    joinedAt: member.joinedAt,
    role: member.role,
    status: member.status,
    tagIds: member.tagIds,
  }
}
