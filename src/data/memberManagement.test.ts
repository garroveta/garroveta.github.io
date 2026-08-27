import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  approveMember,
  rejectPendingMember,
  setMemberSuspended,
  updateMemberRole,
  updateMemberTags,
} from './memberManagement'

const managerId = 'member-lucia'

describe('member management', () => {
  it('approves or rejects pending access requests', () => {
    const approved = approveMember(demoData, 'member-lucas-pending', managerId)
    expect(
      approved.members.find(({ id }) => id === 'member-lucas-pending')?.status,
    ).toBe('approved')
    expect(approved.community.memberCount).toBe(
      demoData.community.memberCount + 1,
    )

    const rejected = rejectPendingMember(
      demoData,
      'member-lucas-pending',
      managerId,
    )
    expect(
      rejected.members.some(({ id }) => id === 'member-lucas-pending'),
    ).toBe(false)
  })

  it('changes roles, tags and suspension for another member', () => {
    const withRole = updateMemberRole(
      demoData,
      'member-marta',
      managerId,
      'moderator',
    )
    const withTags = updateMemberTags(withRole, 'member-marta', managerId, [
      'tag-pauper',
      'unknown-tag',
    ])
    const suspended = setMemberSuspended(
      withTags,
      'member-marta',
      managerId,
      true,
    )

    expect(
      suspended.members.find(({ id }) => id === 'member-marta'),
    ).toMatchObject({
      role: 'moderator',
      tagIds: ['tag-pauper'],
      status: 'suspended',
    })
    expect(
      setMemberSuspended(
        suspended,
        'member-marta',
        managerId,
        false,
      ).members.find(({ id }) => id === 'member-marta')?.status,
    ).toBe('approved')
  })

  it('protects the active manager and rejects unauthorized changes', () => {
    expect(updateMemberRole(demoData, managerId, managerId, 'player')).toBe(
      demoData,
    )
    expect(setMemberSuspended(demoData, managerId, managerId, true)).toBe(
      demoData,
    )
    expect(
      updateMemberRole(
        demoData,
        'member-marta',
        demoData.currentMemberId,
        'manager',
      ),
    ).toBe(demoData)
  })
})
