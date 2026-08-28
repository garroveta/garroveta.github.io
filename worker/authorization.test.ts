import { describe, expect, it, vi } from 'vitest'

import { getApprovedManagerMembership } from './authorization'

interface D1Mock {
  bind: ReturnType<typeof vi.fn>
  db: D1Database
  first: ReturnType<typeof vi.fn>
  prepare: ReturnType<typeof vi.fn>
}

function createD1Mock(result: unknown): D1Mock {
  const first = vi.fn().mockResolvedValue(result)
  const bind = vi.fn().mockReturnValue({ first })
  const prepare = vi.fn().mockReturnValue({ bind })

  return {
    bind,
    db: { prepare } as unknown as D1Database,
    first,
    prepare,
  }
}

describe('Worker manager authorization', () => {
  it('maps an approved manager membership', async () => {
    const d1 = createD1Mock({
      community_id: 'community-crc-delorean',
      display_name: 'Tomás',
      id: 'member-manager',
      role: 'manager',
      status: 'approved',
      user_id: 'user-manager',
    })

    await expect(
      getApprovedManagerMembership(
        d1.db,
        'community-crc-delorean',
        'user-manager',
      ),
    ).resolves.toEqual({
      communityId: 'community-crc-delorean',
      displayName: 'Tomás',
      id: 'member-manager',
      role: 'manager',
      status: 'approved',
      userId: 'user-manager',
    })
    expect(d1.bind).toHaveBeenCalledWith(
      'community-crc-delorean',
      'user-manager',
    )
  })

  it('returns null when the user is not an approved manager', async () => {
    const d1 = createD1Mock(null)

    await expect(
      getApprovedManagerMembership(
        d1.db,
        'community-crc-delorean',
        'user-player',
      ),
    ).resolves.toBeNull()
  })
})
