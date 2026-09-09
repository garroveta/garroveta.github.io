import { describe, expect, it } from 'vitest'

import { formatImportedCardsForWhatsApp } from './cardImportSharing'

describe('formatImportedCardsForWhatsApp', () => {
  it('formats only the newly imported wanted cards', () => {
    expect(
      formatImportedCardsForWhatsApp({
        cards: [
          {
            cardId: 'card-rhystic-study',
            cardName: 'Rhystic Study',
            collectorNumber: '25',
            finish: 'foil',
            language: 'en',
            quantity: 4,
            setCode: 'WOT',
            setName: 'Wilds of Eldraine: Enchanting Tales',
          },
        ],
        communityName: 'CRC Delorean',
        destination: 'wanted',
        memberName: 'Álex Romero',
      }),
    ).toBe(
      [
        '🔎 *Nuevas cartas buscadas por Álex Romero*',
        '• 4× Rhystic Study · WOT #25 · Inglés · Foil',
        '📍 CRC Delorean',
      ].join('\n'),
    )
  })

  it('includes offer details and the public member page', () => {
    expect(
      formatImportedCardsForWhatsApp({
        cards: [
          {
            cardId: 'card-sol-ring',
            cardName: 'Sol Ring',
            collectorNumber: '410',
            condition: 'good',
            finish: 'foil',
            language: 'fr',
            priceEur: 4.75,
            quantity: 3,
            setCode: 'CMM',
            setName: 'Commander Masters',
          },
        ],
        communityName: 'CRC Delorean',
        destination: 'offers',
        memberName: 'Álex Romero',
        offersUrl: 'https://example.com/app/#cartas?member=member-alex-romero',
      }),
    ).toBe(
      [
        '🃏 *Nuevas cartas disponibles de Álex Romero*',
        '• 3× Sol Ring · CMM #410 · Francés · Good · Foil · 4.75 €',
        '📍 CRC Delorean',
        '🔗 Ver ofertas: https://example.com/app/#cartas?member=member-alex-romero',
      ].join('\n'),
    )
  })
})
