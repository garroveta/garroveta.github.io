import { describe, expect, it } from 'vitest'
import { demoData } from './demoData'
import {
  buildWeeklyEventAiPrompt,
  nextWeekMonday,
  parseWeeklyEventImport,
} from './weeklyEventImport'

const candidate = {
  date: '2026-09-21',
  time: '18:00',
  endTime: '21:00',
  gameId: 'game-mtg',
  formatId: 'format-mtg-modern',
  type: 'tournament',
  title: 'Torneo Modern de prueba',
  description: 'Torneo semanal de Magic.',
}

function document(events: unknown[], weekStart = '2026-09-21') {
  return JSON.stringify({ weekStart, events })
}

describe('weekly event import', () => {
  it('builds an AI prompt from active community options and recent history', () => {
    const prompt = buildWeeklyEventAiPrompt(demoData, '2026-08-24')
    expect(prompt).toContain('2026-08-24')
    expect(prompt).toContain('game-mtg=Magic: The Gathering')
    expect(prompt).toContain('format-mtg-modern')
    expect(prompt).toContain(
      'Historial de las últimas cuatro semanas con eventos',
    )
    expect(prompt).toContain('Torneo Modern')
    expect(prompt).toContain('SOLO con JSON válido')
    expect(buildWeeklyEventAiPrompt(demoData, '2026-09-21')).toContain(
      'Torneo Modern',
    )
  })

  it('adds optional manager adjustments without replacing the import rules', () => {
    const prompt = buildWeeklyEventAiPrompt(
      demoData,
      '2026-09-21',
      '  Añadir mesa de pintura el miércoles a las 17:00.  ',
    )
    expect(prompt).toContain(
      'Indicaciones del gerente para esta semana (priorízalas frente al historial',
    )
    expect(prompt).toContain('Añadir mesa de pintura el miércoles a las 17:00.')
    expect(prompt).toContain('weekStart debe ser lunes.')
    expect(prompt).toContain('SOLO con JSON válido')
    expect(
      buildWeeklyEventAiPrompt(demoData, '2026-09-21', '   '),
    ).not.toContain('Indicaciones del gerente')
  })

  it('selects the next Monday in the Madrid time zone', () => {
    expect(nextWeekMonday(new Date('2026-09-15T10:00:00Z'))).toBe('2026-09-21')
  })

  it('accepts reviewed JSON and maps local hours to Madrid ISO timestamps', () => {
    const preview = parseWeeklyEventImport(document([candidate]), demoData)
    expect(preview.errors).toEqual([])
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].duplicate).toBe(false)
    expect(preview.rows[0].input).toMatchObject({
      startsAt: '2026-09-21T18:00:00+02:00',
      endsAt: '2026-09-21T21:00:00+02:00',
      listedInAgenda: true,
      registrationEnabled: false,
      capacity: 0,
      countsForCommunityRanking: false,
    })
  })

  it('rejects dates outside the week and inactive or mismatched MTG formats', () => {
    const preview = parseWeeklyEventImport(
      document([
        { ...candidate, date: '2026-09-28' },
        {
          ...candidate,
          title: 'Otro',
          formatId: 'format-one-piece-constructed',
        },
      ]),
      demoData,
    )
    expect(preview.errors).toEqual([
      'Evento 1: fecha fuera de la semana o no válida.',
      'Evento 2: elige un formato MTG activo.',
    ])
    expect(preview.rows).toEqual([])
  })

  it('rejects unapproved registration and ranking settings', () => {
    const preview = parseWeeklyEventImport(
      document([
        {
          ...candidate,
          gameId: 'game-one-piece',
          formatId: undefined,
          registrationEnabled: true,
          capacity: 8,
        },
        { ...candidate, title: 'Otra actividad', capacity: 4 },
      ]),
      demoData,
    )
    expect(preview.errors).toContain(
      'Evento 1: las inscripciones solo se permiten para MTG.',
    )
    expect(preview.errors).toContain(
      'Evento 2: usa 0 plazas si no hay inscripciones.',
    )
  })

  it('rejects unknown fields, non-HTTPS posters and waitlists without registration', () => {
    const preview = parseWeeklyEventImport(
      document([
        {
          ...candidate,
          status: 'completed',
          imageUri: 'http://example.com/cartel.jpg',
          waitlistEnabled: true,
        },
      ]),
      demoData,
    )
    expect(preview.errors).toContain('Evento 1: campo desconocido «status».')
    expect(preview.errors).toContain(
      'Evento 1: imageUri debe ser una URL HTTPS.',
    )
    expect(preview.errors).toContain(
      'Evento 1: la lista de espera requiere inscripciones.',
    )
  })

  it('omits exact duplicates without changing events already in the agenda', () => {
    const existing = {
      ...demoData,
      events: [
        ...demoData.events,
        {
          ...demoData.events[0],
          id: 'event-existing-import-test',
          title: 'Torneo Modern de prueba',
          startsAt: '2026-09-21T16:00:00.000Z',
        },
      ],
    }
    const preview = parseWeeklyEventImport(
      document([
        candidate,
        { ...candidate, title: 'Actividad nueva' },
        candidate,
      ]),
      existing,
    )
    expect(preview.errors).toEqual([])
    expect(preview.rows.map(({ duplicate }) => duplicate)).toEqual([
      true,
      false,
      true,
    ])
  })

  it('rejects invalid JSON and non-Monday week starts', () => {
    expect(parseWeeklyEventImport('{', demoData).errors).toEqual([
      'El texto no es un JSON válido.',
    ])
    expect(
      parseWeeklyEventImport(document([candidate], '2026-09-22'), demoData)
        .errors,
    ).toEqual(['weekStart debe ser un lunes real en formato AAAA-MM-DD.'])
  })
})
