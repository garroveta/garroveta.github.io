import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { formatNewsPostForWhatsApp } from './newsSharing'

describe('communication sharing', () => {
  it('formats a targeted communication for WhatsApp', () => {
    const post = demoData.newsPosts.find(
      ({ id }) => id === 'news-format-consultation',
    )!

    expect(
      formatNewsPostForWhatsApp(
        post,
        ['Modern', 'Pauper', 'Draft'],
        demoData.community,
      ),
    ).toBe(
      [
        '📣 *¿Qué formato quieres jugar en agosto?*',
        'Dinos en la tienda si prefieres Pauper, Modern o Draft para el próximo evento abierto.',
        'Queremos preparar el próximo evento abierto con el formato que más apetezca a la comunidad. Pásate por la tienda o coméntaselo a Diego para decir si prefieres Pauper, Modern o Draft; anunciaremos el formato elegido y la fecha próximamente.',
        '👥 Para: Modern, Pauper, Draft',
        '📍 CRC Delorean · Inca',
      ].join('\n\n'),
    )
  })

  it('labels a general communication for the whole community', () => {
    expect(
      formatNewsPostForWhatsApp(demoData.newsPosts[0], [], demoData.community),
    ).toContain('👥 Para: Toda la comunidad')
  })
})
