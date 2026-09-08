import type { CommunityEvent } from '../domain/types'

type EventCalendarCommunity = {
  name: string
  address?: string
  city: string
}

type EventCalendarExportInput = {
  event: Pick<
    CommunityEvent,
    'description' | 'endsAt' | 'id' | 'startsAt' | 'title'
  >
  community: EventCalendarCommunity
  eventUrl: string
  generatedAt?: Date
}

export type EventCalendarExport = {
  content: string
  dataUri: string
  fileName: string
}

function escapeCalendarText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function formatUtcDate(date: Date) {
  return date
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function foldCalendarLine(line: string) {
  const encoder = new TextEncoder()
  const foldedLines: string[] = []
  let currentLine = ''
  let currentLimit = 75

  for (const character of line) {
    if (encoder.encode(`${currentLine}${character}`).length > currentLimit) {
      foldedLines.push(currentLine)
      currentLine = ` ${character}`
      currentLimit = 75
      continue
    }

    currentLine += character
  }

  foldedLines.push(currentLine)
  return foldedLines.join('\r\n')
}

function calendarFileName(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${slug || 'evento'}.ics`
}

export function buildEventCalendarExport({
  event,
  community,
  eventUrl,
  generatedAt = new Date(),
}: EventCalendarExportInput): EventCalendarExport {
  const location = [community.name, community.address, community.city]
    .filter(Boolean)
    .join(', ')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Garroveta//Eventos de la comunidad//ES',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(event.id)}@garroveta.app`,
    `DTSTAMP:${formatUtcDate(generatedAt)}`,
    `DTSTART:${formatUtcDate(new Date(event.startsAt))}`,
    ...(event.endsAt ? [`DTEND:${formatUtcDate(new Date(event.endsAt))}`] : []),
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `DESCRIPTION:${escapeCalendarText(event.description)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    `URL:${escapeCalendarText(eventUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const content = `${lines.map(foldCalendarLine).join('\r\n')}\r\n`

  return {
    content,
    dataUri: `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`,
    fileName: calendarFileName(event.title),
  }
}
