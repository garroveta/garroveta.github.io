import { describe, expect, it } from 'vitest'

import { parseCardList } from './cardListImport'

describe('card list imports', () => {
  it('parses a simple list with optional quantities and printings', () => {
    const result = parseCardList(
      'Sol Ring\n2 Rhystic Study\n4 Tinybones, the Pickpocket (OTJ) 109',
    )

    expect(result.source).toBe('text')
    expect(result.items).toEqual([
      expect.objectContaining({ quantity: 1, name: 'Sol Ring' }),
      expect.objectContaining({ quantity: 2, name: 'Rhystic Study' }),
      expect.objectContaining({
        quantity: 4,
        name: 'Tinybones, the Pickpocket',
        setCode: 'OTJ',
        collectorNumber: '109',
      }),
    ])
  })

  it('keeps deck sections without requiring a deck structure', () => {
    const result = parseCardList(
      '4 Bloodghast (DFT) 77\n\n// MAYBEBOARD\n2 Susurian Voidborn (EOE) 118\nSIDEBOARD:\n4 Gut Shot',
    )

    expect(
      result.items.map(({ name, section }) => ({ name, section })),
    ).toEqual([
      { name: 'Bloodghast', section: 'main' },
      { name: 'Susurian Voidborn', section: 'maybeboard' },
      { name: 'Gut Shot', section: 'sideboard' },
    ])
  })

  it('parses ManaBox CSV including quoted names and Scryfall identifiers', () => {
    const result = parseCardList(
      'Name,Set code,Collector number,Quantity,Scryfall ID\n"Tinybones, the Pickpocket",OTJ,109,2,12345678-1234-1234-1234-123456789abc',
    )

    expect(result.source).toBe('manabox_csv')
    expect(result.items[0]).toMatchObject({
      name: 'Tinybones, the Pickpocket',
      setCode: 'OTJ',
      collectorNumber: '109',
      quantity: 2,
      scryfallId: '12345678-1234-1234-1234-123456789abc',
    })
  })
})
