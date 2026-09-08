import { normalizeEventLinkPlayerName } from '../src/data/eventStandingImport'

type ApprovedMemberNameRow = {
  display_name: string
  id: string
}

type UnlinkedStandingEntryRow = {
  display_name: string
  id: string
  standing_id: string
}

export type StandingMemberReconciliationResult = {
  linkedEntries: number
  status: 'ambiguous' | 'error' | 'linked' | 'unmatched'
}

export async function reconcileActiveSeasonStandingEntries(
  db: D1Database,
  communityId: string,
  memberId: string,
  displayName: string,
): Promise<StandingMemberReconciliationResult> {
  const normalizedDisplayName = normalizeEventLinkPlayerName(displayName)
  const { results: approvedMembers } = await db
    .prepare(
      `select id, display_name
      from community_member
      where community_id = ? and status = 'approved'`,
    )
    .bind(communityId)
    .all<ApprovedMemberNameRow>()
  const matchingMembers = approvedMembers.filter(
    (member) =>
      normalizeEventLinkPlayerName(member.display_name) ===
      normalizedDisplayName,
  )

  if (matchingMembers.length !== 1 || matchingMembers[0]?.id !== memberId) {
    return {
      linkedEntries: 0,
      status: matchingMembers.length > 1 ? 'ambiguous' : 'unmatched',
    }
  }

  const { results: unlinkedEntries } = await db
    .prepare(
      `select entry.id, entry.standing_id, entry.display_name
      from event_standing_entry entry
      inner join event_standing standing on standing.id = entry.standing_id
      inner join community_ranking_season season
        on season.id = standing.ranking_season_id
      where standing.community_id = ?
        and season.status = 'active'
        and entry.member_id is null
        and not exists (
          select 1
          from event_standing_entry linked_entry
          where linked_entry.standing_id = entry.standing_id
            and linked_entry.member_id = ?
        )
      order by entry.standing_id, entry.rank, entry.id`,
    )
    .bind(communityId, memberId)
    .all<UnlinkedStandingEntryRow>()
  const matchingEntries = unlinkedEntries.filter(
    (entry) =>
      normalizeEventLinkPlayerName(entry.display_name) ===
      normalizedDisplayName,
  )
  const entriesByStanding = new Map<string, UnlinkedStandingEntryRow[]>()

  for (const entry of matchingEntries) {
    const current = entriesByStanding.get(entry.standing_id) ?? []
    entriesByStanding.set(entry.standing_id, [...current, entry])
  }

  const unambiguousEntries = [...entriesByStanding.values()].flatMap(
    (entries) => (entries.length === 1 ? entries : []),
  )

  if (unambiguousEntries.length === 0) {
    return { linkedEntries: 0, status: 'unmatched' }
  }

  await db.batch(
    unambiguousEntries.map((entry) =>
      db
        .prepare(
          `update event_standing_entry
          set member_id = ?
          where id = ?
            and member_id is null
            and exists (
              select 1
              from event_standing standing
              inner join community_ranking_season season
                on season.id = standing.ranking_season_id
              where standing.id = event_standing_entry.standing_id
                and standing.community_id = ?
                and season.status = 'active'
            )
            and not exists (
              select 1
              from event_standing_entry linked_entry
              where linked_entry.standing_id = event_standing_entry.standing_id
                and linked_entry.member_id = ?
            )`,
        )
        .bind(memberId, entry.id, communityId, memberId),
    ),
  )

  return { linkedEntries: unambiguousEntries.length, status: 'linked' }
}

export async function safelyReconcileActiveSeasonStandingEntries(
  db: D1Database,
  communityId: string,
  memberId: string,
  displayName: string,
) {
  try {
    return await reconcileActiveSeasonStandingEntries(
      db,
      communityId,
      memberId,
      displayName,
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        communityId,
        error: error instanceof Error ? error.message : 'Unknown D1 error',
        event: 'ranking_standing.reconciliation_failed',
        memberId,
      }),
    )

    return { linkedEntries: 0, status: 'error' as const }
  }
}
