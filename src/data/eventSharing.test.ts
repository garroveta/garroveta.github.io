import { describe, expect, it } from 'vitest'

import {
  formatEventForWhatsApp,
  formatEventRegistrationForWhatsApp,
  formatEventResultForWhatsApp,
  formatManagerEventRegistrationsForWhatsApp,
} from './eventSharing'

const event = {
  capacity: 30,
  registrationSummary: { confirmed: 24, waitlisted: 0 },
  startsAt: '2026-09-12T17:00:00+02:00',
  status: 'scheduled' as const,
  title: 'Presentación: The Hobbit',
}

describe('event registration sharing', () => {
  it('formats an event before registration with its availability', () => {
    expect(
      formatEventForWhatsApp({
        community: { name: 'CRC Delorean' },
        event: {
          ...event,
          registrationEnabled: true,
          waitlistEnabled: true,
        },
        eventUrl: 'https://www.garroveta.es/#eventos?event=presentation',
      }),
    ).toBe(
      [
        '🎴 *Presentación: The Hobbit*',
        '📅 Sáb. 12 sept · 17:00 · 📍 CRC Delorean',
        '🎟 Quedan 6 plazas — ¿Te apuntas?',
        '🔗 Ver e inscribirse: https://www.garroveta.es/#eventos?event=presentation',
      ].join('\n'),
    )
  })

  it('keeps sharing useful for events without registration', () => {
    expect(
      formatEventForWhatsApp({
        community: { name: 'CRC Delorean' },
        event: {
          ...event,
          registrationEnabled: false,
          waitlistEnabled: false,
        },
        eventUrl: 'https://www.garroveta.es/#eventos?event=workshop',
      }),
    ).toBe(
      [
        '🎴 *Presentación: The Hobbit*',
        '📅 Sáb. 12 sept · 17:00 · 📍 CRC Delorean',
        '🔗 Ver el evento: https://www.garroveta.es/#eventos?event=workshop',
      ].join('\n'),
    )
  })

  it('formats a compact confirmed registration with the remaining places', () => {
    expect(
      formatEventRegistrationForWhatsApp({
        community: { name: 'CRC Delorean' },
        event,
        eventUrl: 'https://www.garroveta.es/#eventos?event=presentation',
        status: 'confirmed',
      }),
    ).toBe(
      [
        '🎴 Me he apuntado a *Presentación: The Hobbit*',
        '📅 Sáb. 12 sept · 17:00 · 📍 CRC Delorean',
        '🎟 Quedan 6 plazas — ¿Te vienes?',
        '🔗 Ver e inscribirse: https://www.garroveta.es/#eventos?event=presentation',
      ].join('\n'),
    )
  })

  it('uses the waitlist wording when the event is full', () => {
    expect(
      formatEventRegistrationForWhatsApp({
        community: { name: 'CRC Delorean' },
        event: {
          ...event,
          registrationSummary: { confirmed: 30, waitlisted: 3 },
        },
        eventUrl: 'https://www.garroveta.es/#eventos?event=presentation',
        status: 'waitlisted',
      }),
    ).toContain(
      '⏳ El evento está completo — ¿Te apuntas a la espera?\n🔗 Ver el evento:',
    )
  })

  it('formats a compact manager message with participant names and availability', () => {
    expect(
      formatManagerEventRegistrationsForWhatsApp({
        event: { capacity: 4, startsAt: event.startsAt, title: event.title },
        eventUrl: 'https://www.garroveta.es/#eventos?event=presentation',
        participants: [
          { displayName: 'Pep Peralta', status: 'confirmed' },
          { displayName: 'Aina Mir', status: 'confirmed' },
        ],
      }),
    ).toBe(
      [
        '🎴 *Presentación: The Hobbit* · Sáb. 12 sept · 17:00',
        '👥 2/4: Pep Peralta, Aina Mir',
        '🎟 Quedan 2 plazas — Inscripciones: https://www.garroveta.es/#eventos?event=presentation',
      ].join('\n'),
    )
  })

  it('separates the waitlist summary when a presentation is full', () => {
    expect(
      formatManagerEventRegistrationsForWhatsApp({
        event: { capacity: 2, startsAt: event.startsAt, title: event.title },
        eventUrl: 'https://www.garroveta.es/#eventos?event=presentation',
        participants: [
          { displayName: 'Pep Peralta', status: 'confirmed' },
          { displayName: 'Aina Mir', status: 'confirmed' },
          { displayName: 'Biel Ferrer', status: 'waitlisted' },
        ],
      }),
    ).toContain('👥 2/2 inscritos · ⏳ 1 en espera\nPep Peralta, Aina Mir')
  })

  it('formats a complete result with fourteen ranked participants', () => {
    const names = [
      'Pep Peralta Isern',
      'Aina Mir',
      'Biel Ferrer',
      'Carla Pons Alcover',
      'Diego Sánchez',
      'Alexandre Alemany Moyà',
      'Aitor Fernández',
      'Marc Bauza',
      'Iván Yusty',
      'Joan Guillem',
      'Miquel Oliver',
      'Nicolas Fernandez',
      'Fran Parra',
      'Tomeu Cabot',
    ]
    const entries = names.map((displayName, index) => ({
      displayName,
      draws: 0,
      eventPoints: 0,
      gameWinPercentage: 0,
      losses: index === 0 ? 0 : 1,
      opponentGameWinPercentage: 0,
      opponentMatchWinPercentage: 0,
      rank: index + 1,
      wins: index === 0 ? 4 : 3,
    }))

    const message = formatEventResultForWhatsApp({
      event: { startsAt: event.startsAt, title: 'FNM Standard' },
      resultUrl: 'https://www.garroveta.es/#ranking?view=events&standing=fnm',
      standing: { entries },
    })

    expect(message).toContain(
      '🏆 *FNM Standard — Resultados*\n📅 Sáb. 12 sept · 14 jugadores',
    )
    expect(message).toContain('🥇 Pep Peralta Isern · 4-0-0')
    expect(message).toContain('🥈 Aina Mir · 3-1-0')
    expect(message).toContain('🥉 Biel Ferrer · 3-1-0')
    expect(message).toContain('14. Tomeu Cabot · 3-1-0')
    expect(message).toContain(
      '📊 V-D-E · 🔗 Ver clasificación: https://www.garroveta.es/#ranking?view=events&standing=fnm',
    )
    expect(message.split('\n')).toHaveLength(19)
  })
})
