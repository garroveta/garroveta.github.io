import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getScryfallCardImage } from './scryfallImages'

describe('Scryfall card images', () => {
  it('provides an official large image link for every demo card', () => {
    for (const card of demoData.cards) {
      expect(getScryfallCardImage(card.name)).toMatch(
        /^https:\/\/cards\.scryfall\.io\/large\//,
      )
    }
  })
})
