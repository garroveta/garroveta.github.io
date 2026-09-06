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

  it('carries the language, condition and finish of a ManaBox CSV', () => {
    const result = parseCardList(
      [
        'Name,Set code,Quantity,Scryfall ID,Foil,Condition,Language',
        'Bloodghast,MM2,1,id-1,foil,near_mint,en',
        'Gut Shot,NPH,2,id-2,normal,excellent,es',
        'Llanowar Elves,DOM,1,id-3,etched,mint,ja',
      ].join('\n'),
    )

    expect(
      result.items.map(({ language, condition, finish }) => ({
        language,
        condition,
        finish,
      })),
    ).toEqual([
      { language: 'en', condition: 'near_mint', finish: 'foil' },
      { language: 'es', condition: 'excellent', finish: 'nonfoil' },
      { language: 'jp', condition: 'mint', finish: 'foil' },
    ])
  })

  it('keeps the ManaBox grades below good as they are', () => {
    const result = parseCardList(
      [
        'Name,Quantity,Scryfall ID,Condition',
        'Bloodghast,1,id-1,light_played',
        'Gut Shot,1,id-2,played',
        'Sol Ring,1,id-3,poor',
        'Esper Sentinel,1,id-4,LP',
      ].join('\n'),
    )

    expect(result.items.map(({ condition }) => condition)).toEqual([
      'light_played',
      'played',
      'poor',
      'light_played',
    ])
  })

  it('reports an unlisted ManaBox language as other', () => {
    const result = parseCardList(
      [
        'Name,Quantity,Scryfall ID,Language',
        'Bloodghast,1,id-1,ru',
        'Gut Shot,1,id-2,zhs',
      ].join('\n'),
    )

    expect(result.items.map(({ language }) => language)).toEqual([
      'other',
      'other',
    ])
  })

  it('leaves an empty ManaBox value undefined', () => {
    const result = parseCardList(
      'Name,Quantity,Scryfall ID,Condition,Language\nBloodghast,1,id-1,,',
    )

    expect(result.items[0].language).toBeUndefined()
    expect(result.items[0].condition).toBeUndefined()
    expect(result.items[0].finish).toBeUndefined()
  })

  it('never turns a ManaBox purchase price into a sale price', () => {
    const result = parseCardList(
      'Name,Quantity,Scryfall ID,Purchase price\nBloodghast,1,id-1,12.50',
    )

    expect(result.items[0].priceEur).toBeUndefined()
  })

  it('leaves the commercial attributes undefined for a text list', () => {
    const result = parseCardList('2x Bloodghast\n1 Gut Shot')

    result.items.forEach((item) => {
      expect(item.language).toBeUndefined()
      expect(item.condition).toBeUndefined()
      expect(item.finish).toBeUndefined()
    })
  })
})
