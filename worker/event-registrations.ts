import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ApprovedMembership,
} from './authorization'
import { apiError, jsonResponse } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

interface EventRegistrationRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface EventRegistrationRoute {
  communityId: string
  eventId: string
  kind: 'collection' | 'self' | 'member'
  memberId?: string
}

type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled'

interface EventRegistrationRow {
  event_id: string
  id: string
  member_id: string
  registered_at: string
  status: RegistrationStatus
}

interface ManagedEventRegistrationRow extends EventRegistrationRow {
  display_name: string
}

interface RegistrationEventRow {
  capacity: number
  game_id: string
  id: string
  registration_enabled: number
  status: 'scheduled' | 'full' | 'completed'
  waitlist_enabled: number
}

interface RegistrationSummaryRow {
  confirmed: number
  waitlisted: number
}

function toRegistration(registration: EventRegistrationRow) {
  return {
    eventId: registration.event_id,
    id: registration.id,
    memberId: registration.member_id,
    registeredAt: registration.registered_at,
    status: registration.status,
  }
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('es')
}

export function matchEventRegistrationRoute(
  pathname: string,
): EventRegistrationRoute | null {
  const match = pathname.match(
    /^\/api\/communities\/([^/]+)\/events\/([^/]+)\/registrations(?:\/([^/]+))?\/?$/,
  )
  const communityId = match?.[1]
  const eventId = match?.[2]
  const finalSegment = match?.[3]

  if (
    !communityId ||
    !eventId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(eventId)
  ) {
    return null
  }

  if (!finalSegment) {
    return { communityId, eventId, kind: 'collection' }
  }

  if (finalSegment === 'me') {
    return { communityId, eventId, kind: 'self' }
  }

  if (!RESOURCE_ID_PATTERN.test(finalSegment)) {
    return null
  }

  return {
    communityId,
    eventId,
    kind: 'member',
    memberId: finalSegment,
  }
}

export async function getEventRegistrationSummary(
  db: D1Database,
  eventId: string,
) {
  const summary = await db
    .prepare(
      `select
        count(case when status = 'confirmed' then 1 end) as confirmed,
        count(case when status = 'waitlisted' then 1 end) as waitlisted
      from event_registration
      where event_id = ?`,
    )
    .bind(eventId)
    .first<RegistrationSummaryRow>()

  return {
    confirmed: Number(summary?.confirmed ?? 0),
    waitlisted: Number(summary?.waitlisted ?? 0),
  }
}

async function getRegistrationEvent(
  db: D1Database,
  communityId: string,
  eventId: string,
) {
  return db
    .prepare(
      `select
        id,
        game_id,
        registration_enabled,
        waitlist_enabled,
        capacity,
        status
      from community_event
      where community_id = ? and id = ?
      limit 1`,
    )
    .bind(communityId, eventId)
    .first<RegistrationEventRow>()
}

function validateRegistrationEvent(event: RegistrationEventRow | null) {
  if (!event) {
    return apiError(404, 'event_not_found', 'Community event not found.')
  }

  if (event.game_id !== 'game-mtg' || event.registration_enabled !== 1) {
    return apiError(
      409,
      'registration_disabled',
      'Registration is not enabled for this event.',
    )
  }

  if (event.status === 'completed') {
    return apiError(
      409,
      'registration_closed',
      'Registration is closed for this event.',
    )
  }

  return null
}

async function registerMember(
  requestContext: EventRegistrationRequestContext,
  route: EventRegistrationRoute,
  membership: ApprovedMembership,
) {
  const event = await getRegistrationEvent(
    requestContext.env.DB,
    route.communityId,
    route.eventId,
  )
  const invalidEventResponse = validateRegistrationEvent(event)

  if (invalidEventResponse || !event) {
    return invalidEventResponse!
  }

  const now = new Date().toISOString()
  const registrationId = crypto.randomUUID()
  const registration = await requestContext.env.DB.prepare(
    `insert into event_registration (
      id,
      community_id,
      event_id,
      member_id,
      status,
      registered_at,
      updated_at
    )
    select
      ?,
      community_id,
      id,
      ?,
      case
        when (
          select count(*)
          from event_registration
          where event_id = community_event.id and status = 'confirmed'
        ) < capacity then 'confirmed'
        else 'waitlisted'
      end,
      ?,
      ?
    from community_event
    where community_id = ?
      and id = ?
      and game_id = 'game-mtg'
      and registration_enabled = 1
      and status != 'completed'
      and (
        (
          select count(*)
          from event_registration
          where event_id = community_event.id and status = 'confirmed'
        ) < capacity
        or waitlist_enabled = 1
      )
    on conflict(event_id, member_id) do update set
      status = excluded.status,
      registered_at = excluded.registered_at,
      updated_at = excluded.updated_at
    where event_registration.status = 'cancelled'
    returning id, event_id, member_id, status, registered_at`,
  )
    .bind(
      registrationId,
      membership.id,
      now,
      now,
      route.communityId,
      route.eventId,
    )
    .first<EventRegistrationRow>()

  const activeRegistration =
    registration ??
    (await requestContext.env.DB.prepare(
      `select id, event_id, member_id, status, registered_at
      from event_registration
      where event_id = ? and member_id = ? and status != 'cancelled'
      limit 1`,
    )
      .bind(route.eventId, membership.id)
      .first<EventRegistrationRow>())

  if (!activeRegistration) {
    return apiError(
      409,
      'event_full',
      event.waitlist_enabled === 1
        ? 'Registration could not be completed.'
        : 'The event is full and has no waitlist.',
    )
  }

  const registrationSummary = await getEventRegistrationSummary(
    requestContext.env.DB,
    route.eventId,
  )

  console.info(
    JSON.stringify({
      communityId: route.communityId,
      event: 'event_registration.saved',
      eventId: route.eventId,
      memberId: membership.id,
      status: activeRegistration.status,
    }),
  )

  return jsonResponse(
    {
      registration: toRegistration(activeRegistration),
      registrationSummary,
    },
    { status: registration ? 201 : 200 },
  )
}

async function cancelRegistration(
  requestContext: EventRegistrationRequestContext,
  route: EventRegistrationRoute,
  memberId: string,
  actorMemberId: string,
) {
  const cancelled = await requestContext.env.DB.prepare(
    `update event_registration
    set status = 'cancelled', updated_at = ?
    where community_id = ?
      and event_id = ?
      and member_id = ?
      and status in ('confirmed', 'waitlisted')
    returning id`,
  )
    .bind(new Date().toISOString(), route.communityId, route.eventId, memberId)
    .first<{ id: string }>()

  if (!cancelled) {
    const event = await getRegistrationEvent(
      requestContext.env.DB,
      route.communityId,
      route.eventId,
    )

    if (!event) {
      return apiError(404, 'event_not_found', 'Community event not found.')
    }

    return apiError(
      404,
      'registration_not_found',
      'Active registration not found.',
    )
  }

  const registrationSummary = await getEventRegistrationSummary(
    requestContext.env.DB,
    route.eventId,
  )

  console.info(
    JSON.stringify({
      actorMemberId,
      communityId: route.communityId,
      event: 'event_registration.cancelled',
      eventId: route.eventId,
      memberId,
    }),
  )

  return jsonResponse({ cancelledMemberId: memberId, registrationSummary })
}

async function listManagedRegistrations(
  requestContext: EventRegistrationRequestContext,
  route: EventRegistrationRoute,
) {
  const event = await getRegistrationEvent(
    requestContext.env.DB,
    route.communityId,
    route.eventId,
  )

  if (!event) {
    return apiError(404, 'event_not_found', 'Community event not found.')
  }

  const { results } = await requestContext.env.DB.prepare(
    `select
      event_registration.id,
      event_registration.event_id,
      event_registration.member_id,
      event_registration.status,
      event_registration.registered_at,
      community_member.display_name
    from event_registration
    join community_member on community_member.id = event_registration.member_id
    where event_registration.community_id = ?
      and event_registration.event_id = ?
      and event_registration.status in ('confirmed', 'waitlisted')
    order by
      case event_registration.status when 'confirmed' then 0 else 1 end,
      event_registration.registered_at asc,
      event_registration.id asc`,
  )
    .bind(route.communityId, route.eventId)
    .all<ManagedEventRegistrationRow>()
  let waitlistPosition = 0

  return jsonResponse({
    registrations: results.map((registration) => {
      if (registration.status === 'waitlisted') {
        waitlistPosition += 1
      }

      return {
        ...toRegistration(registration),
        displayName: registration.display_name,
        initials: getInitials(registration.display_name),
        waitlistPosition:
          registration.status === 'waitlisted' ? waitlistPosition : undefined,
      }
    }),
  })
}

export async function handleEventRegistrationApiRequest(
  requestContext: EventRegistrationRequestContext,
  route: EventRegistrationRoute,
) {
  const method = requestContext.request.method
  const allowedMethods =
    route.kind === 'collection'
      ? ['GET', 'POST']
      : route.kind === 'self' || route.kind === 'member'
        ? ['DELETE']
        : []

  if (!allowedMethods.includes(method)) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
      { Allow: allowedMethods.join(', ') },
    )
  }

  if (route.kind === 'collection' && method === 'GET') {
    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    return authorization.authorized
      ? listManagedRegistrations(requestContext, route)
      : authorization.response
  }

  if (
    route.kind === 'member' &&
    method === 'DELETE' &&
    route.memberId !== undefined
  ) {
    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    return authorization.authorized
      ? cancelRegistration(
          requestContext,
          route,
          route.memberId,
          authorization.value.membership.id,
        )
      : authorization.response
  }

  const authorization = await authorizeApprovedMember(
    requestContext,
    route.communityId,
  )

  if (!authorization.authorized) {
    return authorization.response
  }

  return route.kind === 'collection'
    ? registerMember(requestContext, route, authorization.value.membership)
    : cancelRegistration(
        requestContext,
        route,
        authorization.value.membership.id,
        authorization.value.membership.id,
      )
}
