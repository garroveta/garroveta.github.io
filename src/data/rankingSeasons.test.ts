import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  activateRankingSeason,
  areRankingSeasonsValid,
  canAssociateMemberWithSeason,
  closeActiveRankingSeason,
  closeRankingSeason,
  createRankingSeason,
  deleteUpcomingRankingSeason,
  getEligibleRankingMemberIds,
  getRankingSeasonForDate,
  type RankingSeasonInput,
} from './rankingSeasons'

const managerId = 'member-lucia'
const seasonInput: RankingSeasonInput = {
  name: 'Temporada 2027',
  startsOn: '2027-01-01',
  endsOn: '2027-12-31',
  points: {
    first: 10,
    second: 8,
    third: 6,
    fourth: 5,
    fifth: 4,
    sixthToTenth: 3,
    participation: 1,
  },
}

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

  it('schedules a new upcoming season for a manager', () => {
    const data = createRankingSeason(demoData, managerId, seasonInput)

    expect(data.rankingSeasons).toHaveLength(demoData.rankingSeasons.length + 1)
    expect(data.rankingSeasons.at(-1)).toMatchObject({
      name: 'Temporada 2027',
      status: 'upcoming',
    })
  })

  it('refuses to schedule a season for a non-manager account', () => {
    const data = createRankingSeason(demoData, 'member-alex', seasonInput)

    expect(data).toBe(demoData)
  })

  it('refuses a season whose dates overlap an existing one', () => {
    const data = createRankingSeason(demoData, managerId, {
      ...seasonInput,
      startsOn: '2026-06-01',
      endsOn: '2027-06-01',
    })

    expect(data.rankingSeasons).toHaveLength(demoData.rankingSeasons.length)
  })

  it('deletes an upcoming season but not an active or closed one', () => {
    const withUpcoming = createRankingSeason(demoData, managerId, seasonInput)
    const upcomingId = withUpcoming.rankingSeasons.at(-1)!.id

    const afterDelete = deleteUpcomingRankingSeason(
      withUpcoming,
      managerId,
      upcomingId,
    )
    expect(afterDelete.rankingSeasons.some(({ id }) => id === upcomingId)).toBe(
      false,
    )

    const activeId = demoData.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!.id
    expect(deleteUpcomingRankingSeason(demoData, managerId, activeId)).toBe(
      demoData,
    )
  })

  it('activates an upcoming season only when none is already active', () => {
    const withUpcoming = createRankingSeason(demoData, managerId, seasonInput)
    const upcomingId = withUpcoming.rankingSeasons.at(-1)!.id

    const stillBlocked = activateRankingSeason(
      withUpcoming,
      managerId,
      upcomingId,
    )
    expect(stillBlocked).toBe(withUpcoming)

    const activeId = withUpcoming.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!.id
    const closed = closeActiveRankingSeason(withUpcoming, managerId, activeId)
    const activated = activateRankingSeason(closed, managerId, upcomingId)

    expect(
      activated.rankingSeasons.find(({ id }) => id === upcomingId),
    ).toMatchObject({ status: 'active' })
  })

  it('freezes eligible members when closing the active season', () => {
    const activeId = demoData.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!.id

    const closed = closeActiveRankingSeason(demoData, managerId, activeId)
    const closedSeason = closed.rankingSeasons.find(({ id }) => id === activeId)

    expect(closedSeason?.status).toBe('closed')
    expect(closeActiveRankingSeason(closed, managerId, activeId)).toBe(closed)
  })
})
