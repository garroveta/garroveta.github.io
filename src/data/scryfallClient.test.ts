import { describe, expect, it, vi } from 'vitest'

import { resolveCardImportItems } from './scryfallClient'

describe('Scryfall import resolution', () => {
  it('resolves names and precise printings through the collection endpoint', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'sol-ring-id',
                oracle_id: 'sol-ring-oracle',
                name: 'Sol Ring',
                set: 'cmm',
                set_name: 'Commander Masters',
                collector_number: '410',
                image_uris: {
                  normal: 'https://cards.scryfall.io/sol-ring.jpg',
                },
              },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch

    const result = await resolveCardImportItems(
      [
        {
          lineNumber: 1,
          rawLine: 'Sol Ring',
          quantity: 1,
          name: 'Sol Ring',
          section: 'main',
        },
        {
          lineNumber: 2,
          rawLine: '2 Sol Ring (CMM) 410',
          quantity: 2,
          name: 'Sol Ring',
          setCode: 'CMM',
          collectorNumber: '410',
          section: 'main',
        },
      ],
      fetcher,
    )

    expect(result).toHaveLength(2)
    expect(result.every(({ status }) => status === 'resolved')).toBe(true)
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/collection',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
