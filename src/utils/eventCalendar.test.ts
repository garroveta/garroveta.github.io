import { describe, expect, it } from 'vitest'

import { buildEventCalendarExport } from './eventCalendar'

describe('buildEventCalendarExport', () => {
  it('builds a portable calendar event with its stable identity and direct URL', () => {
    const result = buildEventCalendarExport({
      event: {
        id: 'event-presentacion-hobbit',
        title: 'Presentación: The Hobbit',
        description: 'Presentación, premios; y primera línea.\nSegunda línea.',
        startsAt: '2026-08-08T15:00:00.000Z',
        endsAt: '2026-08-08T19:00:00.000Z',
      },
      community: {
        name: 'CRC Delorean',
        address: 'Carrer Major, 12',
        city: 'Inca',
      },
      eventUrl:
        'https://example.com/garroveta/#eventos?event=event-presentacion-hobbit',
      generatedAt: new Date('2026-07-01T10:11:12.000Z'),
    })

    expect(result.fileName).toBe('presentacion-the-hobbit.ics')
    expect(result.content).toContain(
      'UID:event-presentacion-hobbit@garroveta.app',
    )
    expect(result.content).toContain('DTSTAMP:20260701T101112Z')
    expect(result.content).toContain('DTSTART:20260808T150000Z')
    expect(result.content).toContain('DTEND:20260808T190000Z')
    expect(result.content).toContain('SUMMARY:Presentación: The Hobbit')
    expect(result.content).toContain(
      'DESCRIPTION:Presentación\\, premios\\; y primera línea.\\nSegunda línea.',
    )
    expect(result.content).toContain(
      'LOCATION:CRC Delorean\\, Carrer Major\\, 12\\, Inca',
    )
    expect(decodeURIComponent(result.dataUri)).toContain(
      'URL:https://example.com/garroveta/#eventos?event=event-presentacion-hobbit',
    )
  })

  it('omits the end time when the event does not have one', () => {
    const result = buildEventCalendarExport({
      event: {
        id: 'event-casual',
        title: 'Juego libre',
        description: 'Tarde abierta.',
        startsAt: '2026-08-09T16:00:00.000Z',
      },
      community: { name: 'CRC Delorean', city: 'Inca' },
      eventUrl: 'https://example.com/#eventos?event=event-casual',
      generatedAt: new Date('2026-07-01T10:11:12.000Z'),
    })

    expect(result.content).not.toContain('DTEND:')
    expect(result.content).toContain('LOCATION:CRC Delorean\\, Inca')
  })

  it('folds long UTF-8 lines to the calendar format limit', () => {
    const result = buildEventCalendarExport({
      event: {
        id: 'event-long',
        title: `Presentación ${'á'.repeat(80)}`,
        description: 'Descripción corta.',
        startsAt: '2026-08-09T16:00:00.000Z',
      },
      community: { name: 'CRC Delorean', city: 'Inca' },
      eventUrl: 'https://example.com/#eventos?event=event-long',
      generatedAt: new Date('2026-07-01T10:11:12.000Z'),
    })

    const summaryLines = result.content
      .split('\r\n')
      .filter((line) => line.startsWith('SUMMARY:') || line.startsWith(' '))

    expect(summaryLines.length).toBeGreaterThan(1)
    for (const line of summaryLines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})
