import type { Community, CommunityEvent } from '../domain/types'

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
      `👥 ${confirmed.length}/${event.capacity} confirmados`,
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
