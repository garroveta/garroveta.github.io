import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCommunityCommunication,
  deleteCommunityCommunication,
  listCommunityCommunications,
  updateCommunityCommunication,
  type CommunityCommunicationWriteInput,
} from './communityCommunications'

const communicationInput: CommunityCommunicationWriteInput = {
  content: 'Abrimos a las 17:00 de miércoles a viernes.',
  excerpt: 'El bar abre más tarde durante el verano.',
  pinned: true,
  tagIds: ['tag-mtg'],
  title: 'Horario de verano',
  type: 'urgent',
}

function mockJsonResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    Response.json(body, {
      status,
    }),
  )
}

describe('community communication API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists communications visible to the authenticated member', async () => {
    const controller = new AbortController()
    const fetchMock = mockJsonResponse({ communications: [] })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listCommunityCommunications('community-crc-delorean', controller.signal),
    ).resolves.toEqual({ communications: [] })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/communications',
      ),
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
  })

  it('creates, updates and deletes communications through manager endpoints', async () => {
    const fetchMock = mockJsonResponse(
      { communication: { id: 'communication-hours' } },
      201,
    )
    vi.stubGlobal('fetch', fetchMock)

    await createCommunityCommunication(
      'community-crc-delorean',
      communicationInput,
    )
    await updateCommunityCommunication(
      'community-crc-delorean',
      'communication-hours',
      communicationInput,
    )
    await deleteCommunityCommunication(
      'community-crc-delorean',
      'communication-hours',
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/communications$/),
      expect.objectContaining({
        body: JSON.stringify(communicationInput),
        credentials: 'include',
        method: 'POST',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/communications\/communication-hours$/),
      expect.objectContaining({
        body: JSON.stringify(communicationInput),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/communications\/communication-hours$/),
      expect.objectContaining({
        credentials: 'include',
        method: 'DELETE',
      }),
    )
  })

  it('encodes community and communication identifiers in request paths', async () => {
    const fetchMock = mockJsonResponse({ deletedCommunicationId: 'notice/1' })
    vi.stubGlobal('fetch', fetchMock)

    await deleteCommunityCommunication('community test', 'notice/1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community%20test/communications/notice%2F1',
      ),
      expect.any(Object),
    )
  })
})
