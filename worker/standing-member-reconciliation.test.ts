import { describe, expect, it, vi } from 'vitest'

import {
  reconcileActiveSeasonStandingEntries,
  safelyReconcileActiveSeasonStandingEntries,
} from './standing-member-reconciliation'

function createDatabase({
  entries = [],
  members = [],
}: {
  entries?: unknown[]
  members?: unknown[]
}) {
  const statements: Array<{
    bind: ReturnType<typeof vi.fn>
    query: string
  }> = []
  const prepare = vi.fn((query: string) => {
    const statement = {
      all: vi.fn().mockResolvedValue({
        results: query.includes('from community_member') ? members : entries,
      }),
      bind: vi.fn(),
      query,
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })
  const batch = vi.fn().mockResolvedValue([])

  return {
    batch,
    db: { batch, prepare } as unknown as D1Database,
    prepare,
    statements,
  }
}

describe('active-season standing member reconciliation', () => {
  it('links every unique exact normalized match in the active season', async () => {
    const { batch, db, statements } = createDatabase({
      members: [{ display_name: 'José Thomas', id: 'member-jose' }],
      entries: [
        {
          display_name: 'Jose  Thomas',
          id: 'entry-1',
          standing_id: 'standing-1',
        },
        {
          display_name: 'JOSÉ THOMAS',
          id: 'entry-2',
          standing_id: 'standing-2',
        },
      ],
    })

    await expect(
      reconcileActiveSeasonStandingEntries(
        db,
        'community-1',
        'member-jose',
        'José Thomas',
      ),
    ).resolves.toEqual({ linkedEntries: 2, status: 'linked' })
    expect(statements[1]?.query).toContain("season.status = 'active'")
    expect(batch).toHaveBeenCalledOnce()
    expect(statements[2]?.bind).toHaveBeenCalledWith(
      'member-jose',
      'entry-1',
      'community-1',
      'member-jose',
    )
    expect(statements[3]?.bind).toHaveBeenCalledWith(
      'member-jose',
      'entry-2',
      'community-1',
      'member-jose',
    )
  })

  it('does not link a name shared by several approved members', async () => {
    const { batch, db, prepare } = createDatabase({
      members: [
        { display_name: 'Alex Romero', id: 'member-alex-1' },
        { display_name: 'Álex Romero', id: 'member-alex-2' },
      ],
    })

    await expect(
      reconcileActiveSeasonStandingEntries(
        db,
        'community-1',
        'member-alex-1',
        'Alex Romero',
      ),
    ).resolves.toEqual({ linkedEntries: 0, status: 'ambiguous' })
    expect(prepare).toHaveBeenCalledOnce()
    expect(batch).not.toHaveBeenCalled()
  })

  it('does not choose between duplicate rows from the same standing', async () => {
    const { batch, db } = createDatabase({
      members: [{ display_name: 'Aina Mir', id: 'member-aina' }],
      entries: [
        {
          display_name: 'Aina Mir',
          id: 'entry-1',
          standing_id: 'standing-1',
        },
        {
          display_name: 'Aina Mir',
          id: 'entry-2',
          standing_id: 'standing-1',
        },
      ],
    })

    await expect(
      reconcileActiveSeasonStandingEntries(
        db,
        'community-1',
        'member-aina',
        'Aina Mir',
      ),
    ).resolves.toEqual({ linkedEntries: 0, status: 'unmatched' })
    expect(batch).not.toHaveBeenCalled()
  })

  it('does not fail the member activation when reconciliation is unavailable', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const db = {
      prepare: vi.fn(() => {
        throw new Error('D1 unavailable')
      }),
    } as unknown as D1Database

    await expect(
      safelyReconcileActiveSeasonStandingEntries(
        db,
        'community-1',
        'member-aina',
        'Aina Mir',
      ),
    ).resolves.toEqual({ linkedEntries: 0, status: 'error' })
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('ranking_standing.reconciliation_failed'),
    )
  })
})
