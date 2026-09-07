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

  it('reads a semicolon CSV with Spanish headers', () => {
    const result = parseCardList(
      [
        'Nombre;Cantidad;Edicion;Numero;Idioma;Estado;Foil;Precio',
        'Sol Ring;3;CMM;410;Ingles;NM;X;1,50',
      ].join('\n'),
    )

    expect(result.source).toBe('csv')
    expect(result.delimiter).toBe(';')
    expect(result.items[0]).toMatchObject({
      name: 'Sol Ring',
      quantity: 3,
      setCode: 'CMM',
      collectorNumber: '410',
      language: 'en',
      condition: 'near_mint',
      finish: 'foil',
      priceEur: 1.5,
    })
  })

  it('reads European and plain decimal prices alike', () => {
    const result = parseCardList(
      [
        'Name,Quantity,Price',
        'Sol Ring,1,"2,50 €"',
        'Rhystic Study,1,12.75',
        'Gut Shot,1,',
      ].join('\n'),
    )

    expect(result.items.map(({ priceEur }) => priceEur)).toEqual([
      2.5,
      12.75,
      undefined,
    ])
  })

  it('reads a tab separated list', () => {
    const result = parseCardList('Name\tQuantity\nSol Ring\t2')

    expect(result.source).toBe('csv')
    expect(result.items[0]).toMatchObject({ name: 'Sol Ring', quantity: 2 })
  })

  it('ignores a set column that holds a name instead of a code', () => {
    const result = parseCardList(
      'Name,Quantity,Expansion\nSol Ring,1,Commander Masters',
    )

    expect(result.items[0].setCode).toBeUndefined()
    expect(result.items[0].name).toBe('Sol Ring')
  })

  it('reports the columns it recognised and those it did not', () => {
    const result = parseCardList('Name,Quantity,Rarity\nSol Ring,1,uncommon')

    expect(result.columns).toEqual([
      { header: 'Name', column: 'name' },
      { header: 'Quantity', column: 'quantity' },
      { header: 'Rarity' },
    ])
  })

  it('maps a field to the first matching column only', () => {
    const result = parseCardList(
      'Name,Card name,Quantity\nSol Ring,Sol Ring bis,1',
    )

    expect(result.columns).toEqual([
      { header: 'Name', column: 'name' },
      { header: 'Card name' },
      { header: 'Quantity', column: 'quantity' },
    ])
    expect(result.items[0].name).toBe('Sol Ring')
  })

  it('asks for the card column when no header names it', () => {
    const result = parseCardList('Ref,Qty\nABC-1,2')

    expect(result.source).toBe('csv')
    expect(result.items).toEqual([])
    expect(result.errors[0].message).toBe(
      'Ninguna columna contiene el nombre de la carta. Indícala más abajo.',
    )
    expect(result.columns).toEqual([
      { header: 'Ref' },
      { header: 'Qty', column: 'quantity' },
    ])
  })

  it('imports a CSV once the card column is mapped by hand', () => {
    const result = parseCardList('Ref,Qty\nSol Ring,2', { 0: 'name' })

    expect(result.errors).toEqual([])
    expect(result.items[0]).toMatchObject({ name: 'Sol Ring', quantity: 2 })
  })

  it('lets a manual choice take a field from the column that had it', () => {
    const result = parseCardList(
      'Name,Alias,Quantity\nSol Ring,Anillo solar,2',
      { 1: 'name' },
    )

    expect(result.columns).toEqual([
      { header: 'Name' },
      { header: 'Alias', column: 'name' },
      { header: 'Quantity', column: 'quantity' },
    ])
    expect(result.items[0].name).toBe('Anillo solar')
  })

  it('drops a column that the reader marks as not to import', () => {
    const result = parseCardList('Name,Price\nSol Ring,4.50', { 1: 'none' })

    expect(result.columns).toEqual([
      { header: 'Name', column: 'name' },
      { header: 'Price' },
    ])
    expect(result.items[0].priceEur).toBeUndefined()
  })

  it('keeps reading a plain text list as text', () => {
    const result = parseCardList(
      '2x Bloodghast\n1 Gut Shot\nSideboard\n1 Sol Ring',
    )

    expect(result.source).toBe('text')
    expect(result.columns).toBeUndefined()
  })

  it('still recognises a ManaBox CSV as such', () => {
    const result = parseCardList('Name,Quantity,Scryfall ID\nSol Ring,1,id-1')

    expect(result.source).toBe('manabox_csv')
  })
})
