import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ApprovedMembership,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const EVENT_TYPES = [
  'tournament',
  'league',
  'draft',
  'casual',
  'workshop',
  'launch',
] as const

type EventType = (typeof EVENT_TYPES)[number]

interface EventRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface EventRoute {
  communityId: string
  eventId?: string
  kind: 'collection' | 'event'
}

interface CommunityEventRow {
  capacity: number
  community_id: string
  competition_event_kind_id: string | null
  counts_for_community_ranking: number
  created_by_member_id: string
  description: string
  ends_at: string | null
  format_id: string | null
  game_id: string
  id: string
  image_uri: string | null
  listed_in_agenda: number
  registration_enabled: number
  starts_at: string
  status: 'scheduled' | 'full' | 'completed'
  tag_ids: string
  title: string
  type: EventType
  waitlist_enabled: number
}

interface CommunityEventInput {
  capacity: number
  competitionEventKindId?: string
  countsForCommunityRanking: boolean
  description: string
  endsAt?: string
  formatId?: string
  gameId: string
  imageUri?: string
  listedInAgenda: boolean
  registrationEnabled: boolean
  startsAt: string
  tagIds: string[]
  title: string
  type: EventType
  waitlistEnabled: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOptionalResourceId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || !RESOURCE_ID_PATTERN.test(value)) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must be a valid identifier.`,
    )
  }

  return value
}

function parseRequiredResourceId(value: unknown, fieldName: string) {
  const id = parseOptionalResourceId(value, fieldName)

  if (!id) {
    throw new ApiRequestError(400, 'event_invalid', `${fieldName} is required.`)
  }

  return id
}

function parseText(value: unknown, fieldName: string, maximumLength: number) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must be a string.`,
    )
  }

  const text = value.trim()

  if (!text || text.length > maximumLength) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must contain between 1 and ${maximumLength} characters.`,
    )
  }

  return text
}

function parseBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must be a boolean.`,
    )
  }

  return value
}

function parseDateTime(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must be an ISO date and time.`,
    )
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      `${fieldName} must be an ISO date and time.`,
    )
  }

  return date.toISOString()
}

function parseOptionalDateTime(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return parseDateTime(value, fieldName)
}

function parseImageUri(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || value.length > 2000) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'imageUri must be a valid HTTPS URL.',
    )
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'imageUri must be a valid HTTPS URL.',
    )
  }

  if (url.protocol !== 'https:') {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'imageUri must be a valid HTTPS URL.',
    )
  }

  return url.toString()
}

function parseTagIds(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (item) => typeof item !== 'string' || !RESOURCE_ID_PATTERN.test(item),
    )
  ) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'tagIds must contain at most 100 valid identifiers.',
    )
  }

  return [...new Set(value)] as string[]
}

function parseEventInput(value: unknown): CommunityEventInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const knownFields = new Set([
    'capacity',
    'competitionEventKindId',
    'countsForCommunityRanking',
    'description',
    'endsAt',
    'formatId',
    'gameId',
    'imageUri',
    'listedInAgenda',
    'registrationEnabled',
    'startsAt',
    'tagIds',
    'title',
    'type',
    'waitlistEnabled',
  ])
  const unknownField = Object.keys(value).find(
    (field) => !knownFields.has(field),
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  const gameId = parseRequiredResourceId(value.gameId, 'gameId')
  const isMagicEvent = gameId === 'game-mtg'
  const formatId = parseOptionalResourceId(value.formatId, 'formatId')
  const competitionEventKindId = parseOptionalResourceId(
    value.competitionEventKindId,
    'competitionEventKindId',
  )

  if (isMagicEvent && (!formatId || !competitionEventKindId)) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'MTG events require a format and a competitive event type.',
    )
  }

  if (
    typeof value.type !== 'string' ||
    !EVENT_TYPES.includes(value.type as EventType)
  ) {
    throw new ApiRequestError(400, 'event_invalid', 'type is not supported.')
  }

  const startsAt = parseDateTime(value.startsAt, 'startsAt')
  const endsAt = parseOptionalDateTime(value.endsAt, 'endsAt')

  if (endsAt !== undefined && endsAt <= startsAt) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'endsAt must be later than startsAt.',
    )
  }

  const registrationEnabled =
    isMagicEvent &&
    parseBoolean(value.registrationEnabled, 'registrationEnabled')
  const waitlistEnabled =
    registrationEnabled &&
    parseBoolean(value.waitlistEnabled, 'waitlistEnabled')
  const capacity = registrationEnabled ? value.capacity : 0

  if (
    typeof capacity !== 'number' ||
    !Number.isInteger(capacity) ||
    capacity < (registrationEnabled ? 1 : 0) ||
    capacity > 500
  ) {
    throw new ApiRequestError(
      400,
      'event_invalid',
      'capacity must be a whole number between 1 and 500 when registration is enabled.',
    )
  }

  return {
    capacity,
    competitionEventKindId: isMagicEvent ? competitionEventKindId : undefined,
    countsForCommunityRanking:
      isMagicEvent &&
      parseBoolean(
        value.countsForCommunityRanking,
        'countsForCommunityRanking',
      ),
    description: parseText(value.description, 'description', 2000),
    endsAt,
    formatId: isMagicEvent ? formatId : undefined,
    gameId,
    imageUri: parseImageUri(value.imageUri),
    listedInAgenda: parseBoolean(value.listedInAgenda, 'listedInAgenda'),
    registrationEnabled,
    startsAt,
    tagIds: parseTagIds(value.tagIds),
    title: parseText(value.title, 'title', 120),
    type: value.type as EventType,
    waitlistEnabled,
  }
}

function parseStoredTagIds(value: string) {
  const parsed: unknown = JSON.parse(value)

  if (
    !Array.isArray(parsed) ||
    !parsed.every((item): item is string => typeof item === 'string')
  ) {
    throw new Error('Stored event tags are not valid.')
  }

  return parsed
}

function toEvent(event: CommunityEventRow) {
  return {
    capacity: event.capacity,
    communityId: event.community_id,
    competitionEventKindId: event.competition_event_kind_id ?? undefined,
    countsForCommunityRanking: event.counts_for_community_ranking === 1,
    createdByMemberId: event.created_by_member_id,
    description: event.description,
    endsAt: event.ends_at ?? undefined,
    formatId: event.format_id ?? undefined,
    gameId: event.game_id,
    id: event.id,
    imageUri: event.image_uri ?? undefined,
    listedInAgenda: event.listed_in_agenda === 1,
    registrationEnabled: event.registration_enabled === 1,
    registrationSummary: {
      confirmed: 0,
      waitlisted: 0,
    },
    startsAt: event.starts_at,
    status: event.status,
    tagIds: parseStoredTagIds(event.tag_ids),
    title: event.title,
    type: event.type,
    waitlistEnabled: event.waitlist_enabled === 1,
  }
}

export function matchEventRoute(pathname: string): EventRoute | null {
  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/events\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId)
  ) {
    return { communityId: collectionCommunityId, kind: 'collection' }
  }

  const eventMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/events\/([^/]+)\/?$/,
  )
  const communityId = eventMatch?.[1]
  const eventId = eventMatch?.[2]

  if (
    !communityId ||
    !eventId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(eventId)
  ) {
    return null
  }

  return { communityId, eventId, kind: 'event' }
}

async function listEvents(
  requestContext: EventRequestContext,
  communityId: string,
  membership: ApprovedMembership,
) {
  const visibilityFilter =
    membership.role === 'manager' ? '' : 'and listed_in_agenda = 1'
  const { results } = await requestContext.env.DB.prepare(
    `select
      id,
      community_id,
      game_id,
      format_id,
      competition_event_kind_id,
      type,
      title,
      description,
      image_uri,
      starts_at,
      ends_at,
      listed_in_agenda,
      counts_for_community_ranking,
      registration_enabled,
      waitlist_enabled,
      capacity,
      status,
      tag_ids,
      created_by_member_id
    from community_event
    where community_id = ? ${visibilityFilter}
    order by starts_at asc, id asc
    limit 500`,
  )
    .bind(communityId)
    .all<CommunityEventRow>()

  return jsonResponse({ events: results.map(toEvent) })
}

async function createEvent(
  requestContext: EventRequestContext,
  communityId: string,
  managerMemberId: string,
) {
  const input = parseEventInput(
    await readJsonBody(requestContext.request, 16_384),
  )
  const eventId = crypto.randomUUID()
  const now = new Date().toISOString()
  const createdEvent = await requestContext.env.DB.prepare(
    `insert into community_event (
      id,
      community_id,
      game_id,
      format_id,
      competition_event_kind_id,
      type,
      title,
      description,
      image_uri,
      starts_at,
      ends_at,
      listed_in_agenda,
      counts_for_community_ranking,
      registration_enabled,
      waitlist_enabled,
      capacity,
      status,
      tag_ids,
      created_by_member_id,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)
    returning *`,
  )
    .bind(
      eventId,
      communityId,
      input.gameId,
      input.formatId ?? null,
      input.competitionEventKindId ?? null,
      input.type,
      input.title,
      input.description,
      input.imageUri ?? null,
      input.startsAt,
      input.endsAt ?? null,
      Number(input.listedInAgenda),
      Number(input.countsForCommunityRanking),
      Number(input.registrationEnabled),
      Number(input.waitlistEnabled),
      input.capacity,
      JSON.stringify(input.tagIds),
      managerMemberId,
      now,
      now,
    )
    .first<CommunityEventRow>()

  if (!createdEvent) {
    throw new Error('The event could not be created.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community_event.created',
      eventId,
    }),
  )

  return jsonResponse({ event: toEvent(createdEvent) }, { status: 201 })
}

async function updateEvent(
  requestContext: EventRequestContext,
  communityId: string,
  eventId: string,
  managerMemberId: string,
) {
  const input = parseEventInput(
    await readJsonBody(requestContext.request, 16_384),
  )
  const updatedEvent = await requestContext.env.DB.prepare(
    `update community_event
    set game_id = ?,
        format_id = ?,
        competition_event_kind_id = ?,
        type = ?,
        title = ?,
        description = ?,
        image_uri = ?,
        starts_at = ?,
        ends_at = ?,
        listed_in_agenda = ?,
        counts_for_community_ranking = ?,
        registration_enabled = ?,
        waitlist_enabled = ?,
        capacity = ?,
        tag_ids = ?,
        updated_at = ?
    where community_id = ? and id = ?
    returning *`,
  )
    .bind(
      input.gameId,
      input.formatId ?? null,
      input.competitionEventKindId ?? null,
      input.type,
      input.title,
      input.description,
      input.imageUri ?? null,
      input.startsAt,
      input.endsAt ?? null,
      Number(input.listedInAgenda),
      Number(input.countsForCommunityRanking),
      Number(input.registrationEnabled),
      Number(input.waitlistEnabled),
      input.capacity,
      JSON.stringify(input.tagIds),
      new Date().toISOString(),
      communityId,
      eventId,
    )
    .first<CommunityEventRow>()

  if (!updatedEvent) {
    return apiError(404, 'event_not_found', 'Community event not found.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community_event.updated',
      eventId,
    }),
  )

  return jsonResponse({ event: toEvent(updatedEvent) })
}

async function deleteEvent(
  requestContext: EventRequestContext,
  communityId: string,
  eventId: string,
  managerMemberId: string,
) {
  const deletedEvent = await requestContext.env.DB.prepare(
    `delete from community_event
    where community_id = ? and id = ?
    returning id`,
  )
    .bind(communityId, eventId)
    .first<{ id: string }>()

  if (!deletedEvent) {
    return apiError(404, 'event_not_found', 'Community event not found.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community_event.deleted',
      eventId,
    }),
  )

  return jsonResponse({ deletedEventId: deletedEvent.id })
}

export async function handleEventApiRequest(
  requestContext: EventRequestContext,
  route: EventRoute,
) {
  const method = requestContext.request.method
  const allowedMethods =
    route.kind === 'collection' ? ['GET', 'POST'] : ['DELETE', 'PATCH']

  if (!allowedMethods.includes(method)) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
      { Allow: allowedMethods.join(', ') },
    )
  }

  try {
    if (route.kind === 'collection' && method === 'GET') {
      const authorization = await authorizeApprovedMember(
        requestContext,
        route.communityId,
      )

      if (!authorization.authorized) {
        return authorization.response
      }

      return await listEvents(
        requestContext,
        route.communityId,
        authorization.value.membership,
      )
    }

    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    if (!authorization.authorized) {
      return authorization.response
    }

    if (route.kind === 'collection') {
      return await createEvent(
        requestContext,
        route.communityId,
        authorization.value.membership.id,
      )
    }

    return method === 'PATCH'
      ? await updateEvent(
          requestContext,
          route.communityId,
          route.eventId!,
          authorization.value.membership.id,
        )
      : await deleteEvent(
          requestContext,
          route.communityId,
          route.eventId!,
          authorization.value.membership.id,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
