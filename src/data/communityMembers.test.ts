import { describe, expect, it } from 'vitest'

import type { ManagedCommunityMember } from '../api/managerMembers'
import { getMemberInitials, toCommunityMember } from './communityMembers'

describe('getMemberInitials', () => {
  it('keeps the first letter of the first two words, uppercased', () => {
    expect(getMemberInitials('Marina Valverde')).toBe('MV')
    expect(getMemberInitials('  José Thomas 🔴⚪ ')).toBe('JT')
    expect(getMemberInitials('Tomás')).toBe('T')
  })
})

describe('toCommunityMember', () => {
  it('adapts a managed member into a full community member', () => {
    const managed: ManagedCommunityMember = {
      displayName: 'Marina Valverde',
      favoriteGameIds: ['game-mtg'],
      id: 'member-player',
      joinedAt: '2026-09-01T10:00:00.000Z',
      role: 'player',
      status: 'approved',
      tagIds: ['tag-pauper'],
    }

    expect(toCommunityMember(managed, 'community-crc-delorean')).toEqual({
      communityId: 'community-crc-delorean',
      contactMethods: [],
      displayName: 'Marina Valverde',
      favoriteGameIds: ['game-mtg'],
      id: 'member-player',
      initials: 'MV',
      joinedAt: '2026-09-01T10:00:00.000Z',
      role: 'player',
      status: 'approved',
      tagIds: ['tag-pauper'],
    })
  })
})
