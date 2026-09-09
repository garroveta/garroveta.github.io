import type { Community, CommunityEvent, EventStanding } from '../domain/types'

type SharedRegistrationStatus = 'confirmed' | 'waitlisted'

type SharedParticipant = {
  displayName: string
  status: string
}

const compactEventDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Madrid',
  weekday: 'short',
})

const compactEventTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
})

function formatCompactDate(value: string) {
  const parts = compactEventDateFormatter.formatToParts(new Date(value))
  const weekday =
    parts.find(({ type }) => type === 'weekday')?.value.replace('.', '') ?? ''
  const day = parts.find(({ type }) => type === 'day')?.value ?? ''
  const month =
    parts.find(({ type }) => type === 'month')?.value.replace('.', '') ?? ''
  const capitalizedWeekday = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`

  return `${capitalizedWeekday}. ${day} ${month}`
}

function formatCompactSchedule(event: Pick<CommunityEvent, 'startsAt'>) {
  return `${formatCompactDate(event.startsAt)} · ${compactEventTimeFormatter.format(new Date(event.startsAt))}`
}

export function formatEventForWhatsApp({
  community,
  event,
  eventUrl,
}: {
  community: Pick<Community, 'name'>
  event: Pick<
    CommunityEvent,
    | 'capacity'
    | 'registrationEnabled'
    | 'registrationSummary'
    | 'startsAt'
    | 'status'
    | 'title'
    | 'waitlistEnabled'
  >
  eventUrl: string
}) {
  const lines = [
    `🎴 *${event.title}*`,
    `📅 ${formatCompactSchedule(event)} · 📍 ${community.name}`,
  ]
  const registrationOpen =
    event.registrationEnabled && event.status !== 'completed'

  if (registrationOpen) {
    const remainingPlaces = Math.max(
      0,
      event.capacity - event.registrationSummary.confirmed,
    )

    if (remainingPlaces > 0) {
      lines.push(
        `🎟 ${remainingPlaces === 1 ? 'Queda 1 plaza' : `Quedan ${remainingPlaces} plazas`} — ¿Te apuntas?`,
      )
    } else if (event.waitlistEnabled !== false) {
      lines.push('⏳ Evento completo — ¿Te apuntas a la lista de espera?')
    } else {
      lines.push('🎟 Evento completo')
    }
  }

  lines.push(
    registrationOpen
      ? `🔗 Ver e inscribirse: ${eventUrl}`
      : `🔗 Ver el evento: ${eventUrl}`,
  )

  return lines.join('\n')
}

export function formatEventRegistrationForWhatsApp({
  community,
  event,
  eventUrl,
  status,
}: {
  community: Pick<Community, 'name'>
  event: Pick<
    CommunityEvent,
    'capacity' | 'registrationSummary' | 'startsAt' | 'title'
  >
  eventUrl: string
  status: SharedRegistrationStatus
}) {
  const schedule = `📅 ${formatCompactSchedule(event)} · 📍 ${community.name}`

  if (status === 'waitlisted') {
    return [
      `🎴 Estoy en lista de espera para *${event.title}*`,
      schedule,
      '⏳ El evento está completo — ¿Te apuntas a la espera?',
      `🔗 Ver el evento: ${eventUrl}`,
    ].join('\n')
  }

  const remainingPlaces = Math.max(
    0,
    event.capacity - event.registrationSummary.confirmed,
  )
  const availability =
    remainingPlaces === 0
      ? '🎟 Evento completo — Consulta la lista de espera'
      : `🎟 ${remainingPlaces === 1 ? 'Queda 1 plaza' : `Quedan ${remainingPlaces} plazas`} — ¿Te vienes?`

  return [
    `🎴 Me he apuntado a *${event.title}*`,
    schedule,
    availability,
    `🔗 Ver e inscribirse: ${eventUrl}`,
  ].join('\n')
}

export function formatManagerEventRegistrationsForWhatsApp({
  event,
  eventUrl,
  participants,
}: {
  event: Pick<CommunityEvent, 'capacity' | 'startsAt' | 'title'>
  eventUrl: string
  participants: SharedParticipant[]
}) {
  const confirmed = participants.filter(({ status }) => status === 'confirmed')
  const waitlisted = participants.filter(
    ({ status }) => status === 'waitlisted',
  )
  const remainingPlaces = Math.max(0, event.capacity - confirmed.length)
  const names =
    confirmed.length > 0
      ? confirmed.map(({ displayName }) => displayName).join(', ')
      : 'Sin participantes confirmados'
  const heading = `🎴 *${event.title}* · ${formatCompactSchedule(event)}`

  if (remainingPlaces === 0) {
    const registrationSummary = [
      `👥 ${confirmed.length}/${event.capacity} inscritos`,
      waitlisted.length > 0 ? `⏳ ${waitlisted.length} en espera` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    return [
      heading,
      registrationSummary,
      names,
      `🔗 Ver inscripciones: ${eventUrl}`,
    ].join('\n')
  }

  const availability =
    remainingPlaces === 1 ? 'Queda 1 plaza' : `Quedan ${remainingPlaces} plazas`

  return [
    heading,
    `👥 ${confirmed.length}/${event.capacity}: ${names}`,
    `🎟 ${availability} — Inscripciones: ${eventUrl}`,
  ].join('\n')
}

export function formatEventResultForWhatsApp({
  event,
  resultUrl,
  standing,
}: {
  event: Pick<CommunityEvent, 'startsAt' | 'title'>
  resultUrl: string
  standing: Pick<EventStanding, 'entries'>
}) {
  const entries = [...standing.entries].sort(
    (first, second) => first.rank - second.rank,
  )
  const ranking = entries.map((entry) => {
    const position =
      entry.rank === 1
        ? '🥇'
        : entry.rank === 2
          ? '🥈'
          : entry.rank === 3
            ? '🥉'
            : `${entry.rank}.`

    return `${position} ${entry.displayName} · ${entry.wins}-${entry.losses}-${entry.draws}`
  })

  return [
    `🏆 *${event.title} — Resultados*`,
    `📅 ${formatCompactDate(event.startsAt)} · ${entries.length} jugadores`,
    '',
    ...ranking,
    '',
    `📊 V-D-E · 🔗 Ver clasificación: ${resultUrl}`,
  ].join('\n')
}
