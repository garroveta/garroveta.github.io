import type { CommunityEventWriteInput } from '../api/communityEvents'
import { isCommunityOptionActive } from './communityOptions'
import { EVENT_TYPE_LABELS } from './registrationSettings'
import type { DemoDataSet, EventType } from '../domain/types'
import {
  addCalendarDays,
  buildMadridIso,
  madridDatePart,
  madridTimePart,
} from '../utils/madridEventTime'

export type WeeklyEventPreviewRow = {
  date: string
  time: string
  title: string
  input: CommunityEventWriteInput
  duplicate: boolean
}

export type WeeklyEventPreview = {
  weekStart: string
  rows: WeeklyEventPreviewRow[]
  errors: string[]
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const eventTypes = Object.keys(EVENT_TYPE_LABELS) as EventType[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

function isMonday(value: string) {
  return new Date(`${value}T12:00:00Z`).getUTCDay() === 1
}

function mondayOfWeek(value: string) {
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay()
  return addCalendarDays(value, -(weekday === 0 ? 6 : weekday - 1))
}

function eventKey(title: string, startsAt: string) {
  return `${title
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()}|${new Date(startsAt).getTime()}`
}

export function nextWeekMonday(reference: Date = new Date()) {
  const today = madridDatePart(reference.toISOString())
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  return addCalendarDays(today, 8 - weekday)
}

export function buildWeeklyEventAiPrompt(
  data: DemoDataSet,
  weekStart: string,
  weeklyAdjustments = '',
) {
  const activeGames = data.games.filter(isCommunityOptionActive)
  const activeFormats = data.competitionFormats.filter(
    (format) =>
      isCommunityOptionActive(format) &&
      format.gameId === 'game-mtg' &&
      activeGames.some((game) => game.id === format.gameId),
  )
  const activeKinds = data.competitionEventKinds.filter(isCommunityOptionActive)
  const activeTags = data.tags.filter(isCommunityOptionActive)
  const previousEvents = data.events
    .filter(
      (event) =>
        event.listedInAgenda !== false &&
        madridDatePart(event.startsAt) < weekStart,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const recentWeeks = [
    ...new Set(
      previousEvents.map((event) =>
        mondayOfWeek(madridDatePart(event.startsAt)),
      ),
    ),
  ].slice(-4)
  const history = previousEvents
    .filter((event) =>
      recentWeeks.includes(mondayOfWeek(madridDatePart(event.startsAt))),
    )
    .map((event) => {
      const date = madridDatePart(event.startsAt)
      return `${date} ${madridTimePart(event.startsAt)}–${event.endsAt ? madridTimePart(event.endsAt) : '?'} | ${event.title} | juego=${event.gameId ?? '?'} | formato=${event.formatId ?? '-'} | tipo=${event.type} | serie=${event.competitionEventKindId ?? '-'} | inscripciones=${event.registrationEnabled === true ? `sí, ${event.capacity} plazas` : 'no'}`
    })

  return [
    `Propón los eventos de CRC DeLorean para la semana del ${weekStart} al ${addCalendarDays(weekStart, 6)} (hora de Inca, Europe/Madrid).`,
    'Usa el historial como referencia para proponer días y horarios; marca como dudas lo que no puedas deducir con seguridad para que el gerente lo ajuste antes de generar el JSON. La imagen del calendario se genera después, a partir de la semana aprobada.',
    `Historial de las últimas cuatro semanas con eventos (${recentWeeks.join(', ') || 'sin datos'}):\n${history.length ? history.join('\n') : 'No hay eventos previos en la aplicación.'}`,
    ...(weeklyAdjustments.trim()
      ? [
          `Indicaciones del gerente para esta semana (priorízalas frente al historial; si alguna queda fuera de la semana o es ambigua, consúltala antes de generar el JSON):\n${weeklyAdjustments.trim()}`,
        ]
      : []),
    `Juegos permitidos (usa el ID): ${activeGames.map((game) => `${game.id}=${game.name}`).join('; ')}`,
    `Formatos (para MTG es obligatorio; usa el ID): ${activeFormats.map((format) => `${format.id}=${format.name} (${format.gameId})`).join('; ') || 'ninguno'}`,
    `Tipos: ${eventTypes.map((type) => `${type}=${EVENT_TYPE_LABELS[type]}`).join('; ')}`,
    `Series opcionales: ${activeKinds.map((kind) => `${kind.id}=${kind.name}`).join('; ') || 'ninguna'}`,
    `Etiquetas opcionales: ${activeTags.map((tag) => `${tag.id}=${tag.name}`).join('; ') || 'ninguna'}`,
    'Al terminar los ajustes, responde SOLO con JSON válido, sin Markdown ni explicaciones. Esquema: {"weekStart":"AAAA-MM-DD","events":[{"date":"AAAA-MM-DD","time":"HH:mm","endTime":"HH:mm","gameId":"ID","formatId":"ID para MTG","type":"tournament","title":"Nombre","description":"Información útil","competitionEventKindId":"ID opcional","registrationEnabled":false,"waitlistEnabled":false,"capacity":0,"countsForCommunityRanking":false,"tagIds":[]}]}',
    'weekStart debe ser lunes. Todas las fechas deben pertenecer a esa semana; endTime debe ser posterior a time el mismo día. Usa únicamente los IDs anteriores. Omite las claves opcionales si no aplican. No actives inscripciones ni ranking por suposición. La URL HTTPS de una imagen puede añadirse como imageUri si ya existe; no uses la imagen semanal como fuente de datos.',
  ].join('\n\n')
}

export function parseWeeklyEventImport(
  source: string,
  data: DemoDataSet,
): WeeklyEventPreview {
  const errors: string[] = []
  const rows: WeeklyEventPreviewRow[] = []
  const cleaned = source
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  let document: unknown

  try {
    document = JSON.parse(cleaned)
  } catch {
    return { weekStart: '', rows, errors: ['El texto no es un JSON válido.'] }
  }

  if (!isRecord(document) || !Array.isArray(document.events)) {
    return {
      weekStart: '',
      rows,
      errors: ['El JSON debe incluir weekStart y una lista events.'],
    }
  }

  const weekStart = document.weekStart
  if (!isCalendarDate(weekStart) || !isMonday(weekStart)) {
    return {
      weekStart: '',
      rows,
      errors: ['weekStart debe ser un lunes real en formato AAAA-MM-DD.'],
    }
  }

  if (document.events.length === 0 || document.events.length > 50) {
    return {
      weekStart,
      rows,
      errors: ['Incluye entre 1 y 50 eventos en la semana.'],
    }
  }

  const existingKeys = new Set(
    data.events.map((event) => eventKey(event.title, event.startsAt)),
  )
  const proposedKeys = new Set<string>()
  const endOfWeek = addCalendarDays(weekStart, 6)

  document.events.forEach((candidate: unknown, index: number) => {
    const prefix = `Evento ${index + 1}`
    if (!isRecord(candidate)) {
      errors.push(`${prefix}: debe ser un objeto.`)
      return
    }

    const allowedFields = new Set([
      'date',
      'time',
      'endTime',
      'gameId',
      'formatId',
      'competitionEventKindId',
      'type',
      'title',
      'description',
      'imageUri',
      'registrationEnabled',
      'waitlistEnabled',
      'capacity',
      'countsForCommunityRanking',
      'tagIds',
    ])
    const unexpected = Object.keys(candidate).find(
      (field) => !allowedFields.has(field),
    )
    if (unexpected) errors.push(`${prefix}: campo desconocido «${unexpected}».`)

    const {
      date,
      time,
      endTime,
      gameId,
      formatId,
      competitionEventKindId,
      type,
      title,
      description,
      imageUri,
      registrationEnabled,
      waitlistEnabled,
      capacity,
      countsForCommunityRanking,
      tagIds,
    } = candidate
    const game = data.games.find(
      (item) => item.id === gameId && isCommunityOptionActive(item),
    )
    const format = data.competitionFormats.find(
      (item) => item.id === formatId && isCommunityOptionActive(item),
    )
    const kind = data.competitionEventKinds.find(
      (item) =>
        item.id === competitionEventKindId && isCommunityOptionActive(item),
    )
    const validTags = new Set(
      data.tags.filter(isCommunityOptionActive).map((tag) => tag.id),
    )
    const registration = registrationEnabled === true
    const capacityValue = capacity === undefined ? 0 : capacity
    const titleText = typeof title === 'string' ? title.trim() : ''
    const descriptionText =
      typeof description === 'string' ? description.trim() : ''

    if (!isCalendarDate(date) || date < weekStart || date > endOfWeek) {
      errors.push(`${prefix}: fecha fuera de la semana o no válida.`)
    }
    if (
      typeof time !== 'string' ||
      !timePattern.test(time) ||
      typeof endTime !== 'string' ||
      !timePattern.test(endTime) ||
      endTime <= time
    ) {
      errors.push(
        `${prefix}: hora de inicio/fin no válida; el fin debe ser posterior el mismo día.`,
      )
    }
    if (!game) errors.push(`${prefix}: juego desconocido o desactivado.`)
    if (game?.id === 'game-mtg' && (!format || format.gameId !== game.id)) {
      errors.push(`${prefix}: elige un formato MTG activo.`)
    }
    if (game?.id !== 'game-mtg' && formatId !== undefined && formatId !== '') {
      errors.push(`${prefix}: no uses formato para este juego.`)
    }
    if (competitionEventKindId && (!kind || game?.id !== 'game-mtg')) {
      errors.push(`${prefix}: serie desconocida o no aplicable.`)
    }
    if (!eventTypes.includes(type as EventType))
      errors.push(`${prefix}: tipo de actividad desconocido.`)
    if (
      !titleText ||
      titleText.length > 120 ||
      !descriptionText ||
      descriptionText.length > 2000
    ) {
      errors.push(`${prefix}: título o descripción vacíos o demasiado largos.`)
    }
    if (imageUri !== undefined && imageUri !== '') {
      try {
        if (typeof imageUri !== 'string') throw new Error()
        const url = new URL(imageUri)
        if (url.protocol !== 'https:' || imageUri.length > 2000)
          throw new Error()
      } catch {
        errors.push(`${prefix}: imageUri debe ser una URL HTTPS.`)
      }
    }
    if (
      (registrationEnabled !== undefined &&
        typeof registrationEnabled !== 'boolean') ||
      (waitlistEnabled !== undefined && typeof waitlistEnabled !== 'boolean') ||
      (countsForCommunityRanking !== undefined &&
        typeof countsForCommunityRanking !== 'boolean')
    ) {
      errors.push(
        `${prefix}: las opciones de inscripción y ranking deben ser booleanas.`,
      )
    }
    if (registration && game?.id !== 'game-mtg')
      errors.push(`${prefix}: las inscripciones solo se permiten para MTG.`)
    if (waitlistEnabled === true && !registration)
      errors.push(`${prefix}: la lista de espera requiere inscripciones.`)
    if (
      typeof capacityValue !== 'number' ||
      !Number.isInteger(capacityValue) ||
      capacityValue < (registration ? 1 : 0) ||
      capacityValue > 500
    ) {
      errors.push(`${prefix}: plazas no válidas.`)
    }
    if (!registration && capacityValue !== 0)
      errors.push(`${prefix}: usa 0 plazas si no hay inscripciones.`)
    if (countsForCommunityRanking === true && game?.id !== 'game-mtg')
      errors.push(`${prefix}: el ranking solo se permite para MTG.`)
    if (
      tagIds !== undefined &&
      (!Array.isArray(tagIds) ||
        tagIds.length > 100 ||
        tagIds.some((id) => typeof id !== 'string' || !validTags.has(id)))
    ) {
      errors.push(`${prefix}: etiqueta desconocida o desactivada.`)
    }

    if (errors.some((error) => error.startsWith(`${prefix}:`))) return
    const startsAt = buildMadridIso(date as string, time as string)
    const key = eventKey(titleText, startsAt)
    const duplicate = existingKeys.has(key) || proposedKeys.has(key)
    proposedKeys.add(key)
    rows.push({
      date: date as string,
      time: time as string,
      title: titleText,
      duplicate,
      input: {
        gameId: gameId as string,
        formatId: game?.id === 'game-mtg' ? (formatId as string) : undefined,
        competitionEventKindId: kind?.id,
        type: type as EventType,
        title: titleText,
        description: descriptionText,
        imageUri: imageUri as string | undefined,
        startsAt,
        endsAt: buildMadridIso(date as string, endTime as string),
        listedInAgenda: true,
        countsForCommunityRanking: countsForCommunityRanking === true,
        registrationEnabled: registration,
        waitlistEnabled: registration && waitlistEnabled === true,
        capacity: registration ? (capacityValue as number) : 0,
        tagIds: (tagIds as string[]) ?? [],
      },
    })
  })

  return { weekStart, rows, errors }
}
