import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { demoData } from '../data/demoData'
import type { DemoDataSet, NewsPost } from '../domain/types'

import { CommunicationManagementPanel } from './CommunicationManagementPanel'

function renderPanel(newsPosts: NewsPost[]) {
  const data: DemoDataSet = { ...demoData, newsPosts }

  render(
    <CommunicationManagementPanel
      data={data}
      onDataChange={vi.fn()}
      onReload={vi.fn()}
      onViewPost={vi.fn()}
      persistenceError={undefined}
      persistenceStatus="ready"
    />,
  )
}

function buildPost(overrides: Partial<NewsPost> & { id: string }): NewsPost {
  return {
    communityId: demoData.community.id,
    authorMemberId: 'member-diego',
    type: 'news',
    title: 'Título',
    excerpt: 'Resumen',
    content: 'Contenido',
    publishedAt: '2026-07-24T16:45:00+02:00',
    tagIds: [],
    pinned: false,
    ...overrides,
  }
}

function optionValues(label: string) {
  return [...screen.getByLabelText(label).querySelectorAll('option')].map(
    (option) => option.value,
  )
}

describe('CommunicationManagementPanel', () => {
  it('does not offer the poll type when writing a communication', () => {
    renderPanel([])

    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))

    expect(optionValues('Tipo de comunicación')).toEqual([
      'news',
      'promotion',
      'arrival',
      'urgent',
      'rule',
    ])
  })

  it('keeps the poll type selectable while editing a publication that uses it', () => {
    renderPanel([buildPost({ id: 'news-legacy-poll', type: 'poll' })])

    fireEvent.click(screen.getByRole('button', { name: 'Modificar Título' }))

    expect(optionValues('Tipo de comunicación')).toEqual([
      'news',
      'promotion',
      'arrival',
      'urgent',
      'rule',
      'poll',
    ])
    expect(screen.getByLabelText('Tipo de comunicación')).toHaveValue('poll')
  })

  it('hides the poll filter when no publication uses it', () => {
    renderPanel([buildPost({ id: 'news-plain', type: 'news' })])

    expect(optionValues('Filtrar comunicaciones por tipo')).not.toContain(
      'poll',
    )
  })

  it('keeps the poll filter while a publication still uses it', () => {
    renderPanel([buildPost({ id: 'news-legacy-poll', type: 'poll' })])

    expect(optionValues('Filtrar comunicaciones por tipo')).toContain('poll')
  })
})
