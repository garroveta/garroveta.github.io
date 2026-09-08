import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const MAX_ENTRIES = 500

interface EventStandingRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface EventStandingRoute {
  communityId: string
  eventId?: string
  kind: 'collection' | 'standing'
}

interface EventStandingEntryInput {
  displayName: string
  draws: number
  eventPoints: number
  gameWinPercentage: number
  losses: number
  memberId?: string
  opponentGameWinPercentage: number
  opponentMatchWinPercentage: number
  rank: number
  wins: number
}

interface EventStandingSourceInput {
  externalEventId?: string
  roundNumber?: number
  storeId?: string
}

interface EventStandingInput {
  countsForCommunityRanking: boolean
  entries: EventStandingEntryInput[]
  source: EventStandingSourceInput
}

interface EventStandingJoinRow {
  display_name: string | null
  draws: number | null
  entry_id: string | null
  event_id: string
  event_points: number | null
  game_win_percentage: number | null
  imported_at: string
  losses: number | null
  member_id: string | null
  opponent_game_win_percentage: number | null
  opponent_match_win_percentage: number | null
  rank: number | null
  ranking_season_id: string | null
  source_external_event_id: string | null
  source_round_number: number | null
  source_store_id: string | null
  standing_id: string
  wins: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseText(value: unknown, fieldName: string, maximumLength: number) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `${fieldName} must be a string.`,
    )
  }

  const text = value.trim()

  if (!text || text.length > maximumLength) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `${fieldName} must contain between 1 and ${maximumLength} characters.`,
    )
  }

  return text
}

function parseOptionalMemberId(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || !RESOURCE_ID_PATTERN.test(value)) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      'memberId must be a valid identifier.',
    )
  }

  return value
}

function parseOptionalText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return parseText(value, fieldName, maximumLength)
}

function parseInteger(
  value: unknown,
  fieldName: string,
  minimum: number,
  maximum: number,
) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `${fieldName} must be a whole number between ${minimum} and ${maximum}.`,
    )
  }

  return value
}

function parsePercentage(value: unknown, fieldName: string) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `${fieldName} must be a number between 0 and 100.`,
    )
  }

  return value
}

function parseBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `${fieldName} must be a boolean.`,
    )
  }

  return value
}

function parseEventStandingEntry(
  value: unknown,
  index: number,
): EventStandingEntryInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `entries[${index}] must be a JSON object.`,
    )
  }

  return {
    displayName: parseText(
      value.displayName,
      `entries[${index}].displayName`,
      120,
    ),
    draws: parseInteger(value.draws, `entries[${index}].draws`, 0, 200),
    eventPoints: parseInteger(
      value.eventPoints,
      `entries[${index}].eventPoints`,
      0,
      1000,
    ),
    gameWinPercentage: parsePercentage(
      value.gameWinPercentage,
      `entries[${index}].gameWinPercentage`,
    ),
    losses: parseInteger(value.losses, `entries[${index}].losses`, 0, 200),
    memberId: parseOptionalMemberId(value.memberId),
    opponentGameWinPercentage: parsePercentage(
      value.opponentGameWinPercentage,
      `entries[${index}].opponentGameWinPercentage`,
    ),
    opponentMatchWinPercentage: parsePercentage(
      value.opponentMatchWinPercentage,
      `entries[${index}].opponentMatchWinPercentage`,
    ),
    rank: parseInteger(value.rank, `entries[${index}].rank`, 1, 1000),
    wins: parseInteger(value.wins, `entries[${index}].wins`, 0, 200),
  }
}

function parseEventStandingSource(value: unknown): EventStandingSourceInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      'source must be a JSON object.',
    )
  }

  const roundNumber =
    value.roundNumber === undefined || value.roundNumber === null
      ? undefined
      : parseInteger(value.roundNumber, 'source.roundNumber', 1, 100)

  return {
    externalEventId: parseOptionalText(
      value.externalEventId,
      'source.externalEventId',
      50,
    ),
    roundNumber,
    storeId: parseOptionalText(value.storeId, 'source.storeId', 50),
  }
}

function parseEventStandingInput(value: unknown): EventStandingInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      'The request body must be a JSON object.',
    )
  }

  if (
    !Array.isArray(value.entries) ||
    value.entries.length === 0 ||
    value.entries.length > MAX_ENTRIES
  ) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      `entries must contain between 1 and ${MAX_ENTRIES} players.`,
    )
  }

  const entries = value.entries.map((entry, index) =>
    parseEventStandingEntry(entry, index),
  )
  const assignedMemberIds = entries.flatMap(({ memberId }) =>
    memberId ? [memberId] : [],
  )

  if (new Set(assignedMemberIds).size !== assignedMemberIds.length) {
    throw new ApiRequestError(
      400,
      'event_standing_invalid',
      'A member cannot be linked to more than one row.',
    )
  }

  return {
    countsForCommunityRanking: parseBoolean(
      value.countsForCommunityRanking,
      'countsForCommunityRanking',
    ),
    entries,
    source: parseEventStandingSource(value.source),
  }
}

export function matchEventStandingRoute(
  pathname: string,
): EventStandingRoute | null {
  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/event-standings\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId)
  ) {
    return { communityId: collectionCommunityId, kind: 'collection' }
  }

  const standingMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/event-standings\/([^/]+)\/?$/,
  )
  const communityId = standingMatch?.[1]
  const eventId = standingMatch?.[2]

  if (
    !communityId ||
    !eventId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(eventId)
  ) {
    return null
  }

  return { communityId, eventId, kind: 'standing' }
}

function toEventStanding(rows: EventStandingJoinRow[]) {
  return {
    entries: rows
      .filter((row): row is EventStandingJoinRow & { entry_id: string } =>
        Boolean(row.entry_id),
      )
      .map((row) => ({
        displayName: row.display_name!,
        draws: row.draws!,
        eventPoints: row.event_points!,
        gameWinPercentage: row.game_win_percentage!,
        losses: row.losses!,
        memberId: row.member_id ?? undefined,
        opponentGameWinPercentage: row.opponent_game_win_percentage!,
        opponentMatchWinPercentage: row.opponent_match_win_percentage!,
        rank: row.rank!,
        wins: row.wins!,
      })),
    eventId: rows[0]!.event_id,
    id: rows[0]!.standing_id,
    rankingSeasonId: rows[0]!.ranking_season_id ?? undefined,
    source: {
      externalEventId: rows[0]!.source_external_event_id ?? undefined,
      importedAt: rows[0]!.imported_at,
      kind: 'eventlink_html' as const,
      roundNumber: rows[0]!.source_round_number ?? undefined,
      storeId: rows[0]!.source_store_id ?? undefined,
    },
  }
}

function groupStandingRows(rows: EventStandingJoinRow[]) {
  const rowsByStandingId = new Map<string, EventStandingJoinRow[]>()

  for (const row of rows) {
    const current = rowsByStandingId.get(row.standing_id) ?? []
    current.push(row)
    rowsByStandingId.set(row.standing_id, current)
  }

  return [...rowsByStandingId.values()].map(toEventStanding)
}

async function listEventStandings(
  requestContext: EventStandingRequestContext,
  communityId: string,
) {
  const { results } = await requestContext.env.DB.prepare(
    `select
      s.id as standing_id,
      s.event_id,
      s.ranking_season_id,
      s.source_store_id,
      s.source_external_event_id,
      s.source_round_number,
      s.imported_at,
      e.id as entry_id,
      e.member_id,
      e.rank,
      e.display_name,
      e.event_points,
      e.wins,
      e.losses,
      e.draws,
      e.opponent_match_win_percentage,
      e.game_win_percentage,
      e.opponent_game_win_percentage
    from event_standing s
    left join event_standing_entry e on e.standing_id = s.id
    where s.community_id = ?
    order by s.imported_at desc, e.rank asc`,
  )
    .bind(communityId)
    .all<EventStandingJoinRow>()

  return jsonResponse({ standings: groupStandingRows(results) })
}

async function createOrReplaceEventStanding(
  requestContext: EventStandingRequestContext,
  communityId: string,
  eventId: string,
) {
  const input = parseEventStandingInput(
    await readJsonBody(requestContext.request, 32_768),
  )
  const db = requestContext.env.DB

  const event = await db
    .prepare(
      `select game_id, format_id, starts_at, ends_at
      from community_event
      where id = ? and community_id = ?
      limit 1`,
    )
    .bind(eventId, communityId)
    .first<{
      ends_at: string | null
      format_id: string | null
      game_id: string
      starts_at: string
    }>()

  if (!event) {
    return apiError(404, 'event_not_found', 'Community event not found.')
  }

  if (event.game_id !== 'game-mtg' || !event.format_id) {
    return apiError(
      409,
      'event_standing_missing_format',
      'Set a Magic: The Gathering format for this event before importing results.',
    )
  }

  const format = await db
    .prepare(
      `select id from community_format
      where id = ? and community_id = ? and game_id = ?
      limit 1`,
    )
    .bind(event.format_id, communityId, event.game_id)
    .first<{ id: string }>()

  if (!format) {
    return apiError(
      409,
      'event_standing_missing_format',
      'Set a Magic: The Gathering format for this event before importing results.',
    )
  }

  const assignedMemberIds = input.entries.flatMap(({ memberId }) =>
    memberId ? [memberId] : [],
  )

  if (assignedMemberIds.length > 0) {
    const placeholders = assignedMemberIds.map(() => '?').join(', ')
    const { results: approvedMembers } = await db
      .prepare(
        `select id from community_member
        where community_id = ? and status = 'approved' and id in (${placeholders})`,
      )
      .bind(communityId, ...assignedMemberIds)
      .all<{ id: string }>()

    if (approvedMembers.length !== assignedMemberIds.length) {
      return apiError(
        400,
        'event_standing_invalid_member',
        'One or more linked members are not approved community members.',
      )
    }
  }

  const eventDate = (event.ends_at ?? event.starts_at).slice(0, 10)
  const season = await db
    .prepare(
      `select id, status from community_ranking_season
      where community_id = ? and starts_on <= ? and ends_on >= ?
      limit 1`,
    )
    .bind(communityId, eventDate, eventDate)
    .first<{ id: string; status: string }>()

  if (season?.status === 'closed') {
    return apiError(
      409,
      'ranking_season_closed',
      'Results cannot be imported into a closed ranking season.',
    )
  }

  const now = new Date().toISOString()
  const candidateId = crypto.randomUUID()

  const upserted = await db
    .prepare(
      `insert into event_standing (
        id,
        community_id,
        event_id,
        ranking_season_id,
        source_store_id,
        source_external_event_id,
        source_round_number,
        imported_at,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict (event_id) do update set
        ranking_season_id = excluded.ranking_season_id,
        source_store_id = excluded.source_store_id,
        source_external_event_id = excluded.source_external_event_id,
        source_round_number = excluded.source_round_number,
        imported_at = excluded.imported_at,
        updated_at = excluded.updated_at
      returning id`,
    )
    .bind(
      candidateId,
      communityId,
      eventId,
      season?.id ?? null,
      input.source.storeId ?? null,
      input.source.externalEventId ?? null,
      input.source.roundNumber ?? null,
      now,
      now,
      now,
    )
    .first<{ id: string }>()

  if (!upserted) {
    return apiError(500, 'internal_error', 'The standing could not be saved.')
  }

  const standingId = upserted.id

  await db.batch([
    db
      .prepare(`delete from event_standing_entry where standing_id = ?`)
      .bind(standingId),
    ...input.entries.map((entry) =>
      db
        .prepare(
          `insert into event_standing_entry (
            id,
            standing_id,
            member_id,
            rank,
            display_name,
            event_points,
            wins,
            losses,
            draws,
            opponent_match_win_percentage,
            game_win_percentage,
            opponent_game_win_percentage
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          standingId,
          entry.memberId ?? null,
          entry.rank,
          entry.displayName,
          entry.eventPoints,
          entry.wins,
          entry.losses,
          entry.draws,
          entry.opponentMatchWinPercentage,
          entry.gameWinPercentage,
          entry.opponentGameWinPercentage,
        ),
    ),
    db
      .prepare(
        `update community_event
        set status = 'completed', counts_for_community_ranking = ?, updated_at = ?
        where id = ? and community_id = ?`,
      )
      .bind(Number(input.countsForCommunityRanking), now, eventId, communityId),
  ])

  return jsonResponse({
    standing: {
      entries: input.entries,
      eventId,
      id: standingId,
      rankingSeasonId: season?.id,
      source: {
        externalEventId: input.source.externalEventId,
        importedAt: now,
        kind: 'eventlink_html' as const,
        roundNumber: input.source.roundNumber,
        storeId: input.source.storeId,
      },
    },
  })
}

export async function handleEventStandingApiRequest(
  requestContext: EventStandingRequestContext,
  route: EventStandingRoute,
) {
  const method = requestContext.request.method
  const allowedMethods = route.kind === 'collection' ? ['GET'] : ['PUT']

  if (!allowedMethods.includes(method)) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
      { Allow: allowedMethods.join(', ') },
    )
  }

  try {
    if (route.kind === 'collection') {
      const authorization = await authorizeApprovedMember(
        requestContext,
        route.communityId,
      )

      if (!authorization.authorized) {
        return authorization.response
      }

      return await listEventStandings(requestContext, route.communityId)
    }

    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    if (!authorization.authorized) {
      return authorization.response
    }

    return await createOrReplaceEventStanding(
      requestContext,
      route.communityId,
      route.eventId!,
    )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
