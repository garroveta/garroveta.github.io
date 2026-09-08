import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const communicationApiMocks = vi.hoisted(() => ({
  createCommunityCommunication: vi.fn(),
  deleteCommunityCommunication: vi.fn(),
  updateCommunityCommunication: vi.fn(),
}))

vi.mock('../api/communityCommunications', () => communicationApiMocks)

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

  it('sends the schedule chosen by the author', async () => {
    communicationApiMocks.createCommunityCommunication.mockResolvedValue({
      communication: buildPost({ id: 'news-new' }),
    })
    renderPanel([])

    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Horario de verano' },
    })
    fireEvent.change(screen.getByLabelText('Resumen'), {
      target: { value: 'Resumen' },
    })
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: { value: 'Contenido' },
    })
    fireEvent.change(screen.getByLabelText('Fecha de publicación'), {
      target: { value: '2026-09-20T10:00' },
    })
    fireEvent.change(screen.getByLabelText('Fecha de caducidad'), {
      target: { value: '2026-09-30T23:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() =>
      expect(
        communicationApiMocks.createCommunityCommunication,
      ).toHaveBeenCalledWith(
        demoData.community.id,
        expect.objectContaining({
          publishedAt: new Date('2026-09-20T10:00').toISOString(),
          expiresAt: new Date('2026-09-30T23:00').toISOString(),
        }),
      ),
    )
  })

  it('leaves the expiry empty when the author sets none', async () => {
    communicationApiMocks.createCommunityCommunication.mockResolvedValue({
      communication: buildPost({ id: 'news-new' }),
    })
    renderPanel([])

    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Sin caducidad' },
    })
    fireEvent.change(screen.getByLabelText('Resumen'), {
      target: { value: 'Resumen' },
    })
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: { value: 'Contenido' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() =>
      expect(
        communicationApiMocks.createCommunityCommunication,
      ).toHaveBeenCalledWith(
        demoData.community.id,
        expect.objectContaining({ expiresAt: null }),
      ),
    )
  })

  it('keeps the schedule when only pinning a publication', async () => {
    communicationApiMocks.updateCommunityCommunication.mockResolvedValue({
      communication: buildPost({ id: 'news-scheduled' }),
    })
    renderPanel([
      buildPost({
        id: 'news-scheduled',
        publishedAt: '2026-09-20T08:00:00.000Z',
        expiresAt: '2026-09-30T21:00:00.000Z',
      }),
    ])

    fireEvent.click(
      screen.getByRole('button', { name: /^Fijar|Dejar de fijar/ }),
    )

    await waitFor(() =>
      expect(
        communicationApiMocks.updateCommunityCommunication,
      ).toHaveBeenCalledWith(
        demoData.community.id,
        'news-scheduled',
        expect.objectContaining({
          publishedAt: '2026-09-20T08:00:00.000Z',
          expiresAt: '2026-09-30T21:00:00.000Z',
        }),
      ),
    )
  })

  it('labels and orders publications by schedule state', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T12:00:00+02:00'))

    try {
      renderPanel([
        buildPost({
          id: 'news-live',
          title: 'En curso',
          publishedAt: '2026-08-01T10:00:00+02:00',
        }),
        buildPost({
          id: 'news-scheduled',
          title: 'Aún no publicada',
          publishedAt: '2026-12-01T10:00:00+02:00',
        }),
        buildPost({
          id: 'news-expired-pinned',
          title: 'Caducada y fijada',
          pinned: true,
          publishedAt: '2026-07-01T10:00:00+02:00',
          expiresAt: '2026-08-15T10:00:00+02:00',
        }),
      ])

      const rows = screen.getAllByRole('article')
      expect(
        rows.map((row) => row.querySelector('strong')?.textContent),
      ).toEqual(['Aún no publicada', 'En curso', 'Caducada y fijada'])

      const scheduledRow = screen
        .getByText('Aún no publicada')
        .closest('article')
      expect(
        within(scheduledRow as HTMLElement).getByText('Programada'),
      ).toBeInTheDocument()
      expect(
        within(scheduledRow as HTMLElement).getByText(/Se publica el/),
      ).toBeInTheDocument()

      const liveRow = screen.getByText('En curso').closest('article')
      expect(
        within(liveRow as HTMLElement).queryByText('Programada'),
      ).not.toBeInTheDocument()
      expect(
        within(liveRow as HTMLElement).queryByText('Caducada'),
      ).not.toBeInTheDocument()
      expect(
        within(liveRow as HTMLElement).getByText(/Publicado el/),
      ).toBeInTheDocument()

      const expiredRow = screen
        .getByText('Caducada y fijada')
        .closest('article')
      expect(
        within(expiredRow as HTMLElement).getByText('Caducada'),
      ).toBeInTheDocument()
      // pinned no longer beats the schedule: it still sorts after the live post
      expect(
        within(expiredRow as HTMLElement).getByText('Fijada'),
      ).toBeInTheDocument()
      expect(
        within(expiredRow as HTMLElement).getByText(/Caducó el/),
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
