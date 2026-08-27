import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { formatNewsPostForWhatsApp } from './newsSharing'

describe('communication sharing', () => {
  it('formats a targeted communication for WhatsApp', () => {
    const post = demoData.newsPosts.find(({ id }) => id === 'news-format-poll')!

    expect(
      formatNewsPostForWhatsApp(
        post,
        ['Modern', 'Pauper', 'Draft'],
        demoData.community,
      ),
    ).toBe(
      [
        '📣 *¿Qué formato quieres jugar en agosto?*',
        'Vota entre Pauper, Modern y Draft para el próximo evento abierto.',
        'Queremos preparar el próximo evento abierto con el formato que más apetezca a la comunidad. Elige entre Pauper, Modern y Draft; anunciaremos el resultado y la fecha próximamente.',
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
