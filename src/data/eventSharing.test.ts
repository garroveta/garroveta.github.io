import { describe, expect, it } from 'vitest'

import {
  formatEventRegistrationForWhatsApp,
  formatManagerEventRegistrationsForWhatsApp,
} from './eventSharing'

const event = {
  capacity: 30,
  registrationSummary: { confirmed: 24, waitlisted: 0 },
  startsAt: '2026-09-12T17:00:00+02:00',
  title: 'Presentación: The Hobbit',
}

describe('event registration sharing', () => {
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
})
