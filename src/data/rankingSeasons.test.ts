import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  areRankingSeasonsValid,
  canAssociateMemberWithSeason,
  closeRankingSeason,
  getEligibleRankingMemberIds,
  getRankingSeasonForDate,
} from './rankingSeasons'

describe('ranking seasons', () => {
  it('accepts the non-overlapping community seasons', () => {
    expect(areRankingSeasonsValid(demoData.rankingSeasons)).toBe(true)
  })

  it('rejects overlapping seasons', () => {
    const seasons = structuredClone(demoData.rankingSeasons)
    seasons[1].startsOn = '2025-12-01'

    expect(areRankingSeasonsValid(seasons)).toBe(false)
  })

  it('resolves a season from the local date of an event', () => {
    expect(
      getRankingSeasonForDate(
        demoData.rankingSeasons,
        '2026-08-02T17:00:00+02:00',
      ),
    ).toMatchObject({ id: 'ranking-season-2026', status: 'active' })
  })

  it('freezes eligible members when an active season closes', () => {
    const activeSeason = demoData.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!
    const closedSeason = closeRankingSeason(activeSeason, [
      'member-alex',
      'member-alex',
      'member-marta',
    ])

    expect(closedSeason).toMatchObject({
      status: 'closed',
      eligibleMemberIds: ['member-alex', 'member-marta'],
    })
    expect(canAssociateMemberWithSeason(closedSeason)).toBe(false)
  })

  it('does not add a member activated after a season was closed', () => {
    const closedSeason = demoData.rankingSeasons.find(
      ({ status }) => status === 'closed',
    )!
    const membersAfterActivation = structuredClone(demoData.members)
    const lateMember = membersAfterActivation.find(
      ({ id }) => id === 'member-lucas-pending',
    )!
    lateMember.status = 'approved'

    const eligibleMemberIds = getEligibleRankingMemberIds(
      closedSeason,
      membersAfterActivation,
    )

    expect(eligibleMemberIds.has(lateMember.id)).toBe(false)
    expect(canAssociateMemberWithSeason(closedSeason)).toBe(false)
  })

  it('allows a newly approved member in an active season', () => {
    const activeSeason = demoData.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!
    const membersAfterActivation = structuredClone(demoData.members)
    const lateMember = membersAfterActivation.find(
      ({ id }) => id === 'member-lucas-pending',
    )!
    lateMember.status = 'approved'

    expect(
      getEligibleRankingMemberIds(activeSeason, membersAfterActivation).has(
        lateMember.id,
      ),
    ).toBe(true)
    expect(canAssociateMemberWithSeason(activeSeason)).toBe(true)
  })
})
