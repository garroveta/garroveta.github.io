import { describe, expect, it } from 'vitest'

import { parseEventLinkHtml } from './eventLinkImport'

const eventLinkFixture = `
  <!-- saved from url=(0077)https://eventlink.wizards.com/stores/18452/events/11620006/rounds/5/standings -->
  <main>
    <h1 class="event-page-header__title">Pauper de prueba</h1>
    <div class="round-timer__complete">Se completó</div>
    <div class="round-timer__round-number">Ronda 5</div>
    <div storeid="18452" eventid="11620006" roundnumber="5">
      <table class="standings">
        <thead>
          <tr>
            <th>Puesto</th><th>Nombre</th><th>Puntos</th><th>V/D/E</th>
            <th>%VPO</th><th>%JG</th><th>%JGO</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Alba Torres</td><td>15</td><td>5/0/0</td><td>72.0%</td><td>81.8%</td><td>63.2%</td><td></td></tr>
          <tr><td>2</td><td>Joan Pérez Villalonga 🔴⚪</td><td>12</td><td>4/1/0</td><td>60,7%</td><td>75.0%</td><td>55.5%</td><td></td></tr>
        </tbody>
      </table>
    </div>
  </main>
`

describe('EventLink standings imports', () => {
  it('extracts standings and source metadata from a saved EventLink page', () => {
    const result = parseEventLinkHtml(eventLinkFixture)

    expect(result.errors).toEqual([])
    expect(result.standing).toMatchObject({
      eventTitle: 'Pauper de prueba',
      storeId: '18452',
      externalEventId: '11620006',
      roundNumber: 5,
      completed: true,
    })
    expect(result.standing?.rows).toEqual([
      {
        rank: 1,
        displayName: 'Alba Torres',
        eventPoints: 15,
        wins: 5,
        losses: 0,
        draws: 0,
        opponentMatchWinPercentage: 72,
        gameWinPercentage: 81.8,
        opponentGameWinPercentage: 63.2,
      },
      expect.objectContaining({
        rank: 2,
        displayName: 'Joan Pérez Villalonga 🔴⚪',
        opponentMatchWinPercentage: 60.7,
      }),
    ])
  })

  it('finds the standings by its headers instead of relying on CSS classes', () => {
    const result = parseEventLinkHtml(
      eventLinkFixture.replace('class="standings"', 'class="future-table"'),
    )

    expect(result.standing?.rows).toHaveLength(2)
  })

  it('rejects invalid and unrelated HTML files', () => {
    expect(parseEventLinkHtml('<h1>Otra página</h1>').errors).toEqual([
      'No se ha encontrado una tabla de clasificación EventLink válida.',
    ])

    const invalid = eventLinkFixture.replace('<td>5/0/0</td>', '<td>cinco</td>')
    expect(parseEventLinkHtml(invalid).errors).toContain(
      'La fila 1 contiene datos no válidos.',
    )
  })

  it('warns when the exported round is not marked as completed', () => {
    const result = parseEventLinkHtml(
      eventLinkFixture.replace('Se completó', 'En curso'),
    )

    expect(result.standing?.completed).toBe(false)
    expect(result.standing?.warnings).toContain(
      'La ronda no parece estar marcada como finalizada.',
    )
  })
})
