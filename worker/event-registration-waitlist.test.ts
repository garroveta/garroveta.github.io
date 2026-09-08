// @vitest-environment node

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../migrations/0004_event_registrations.sql', import.meta.url),
  'utf8',
)

describe('event registration waitlist trigger', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      create table community (id text primary key);
      create table community_event (id text primary key);
      create table community_member (id text primary key);
      ${migration}
      insert into community (id) values ('community');
      insert into community_event (id) values ('event');
      insert into community_member (id) values
        ('member-confirmed'),
        ('member-waitlisted-first'),
        ('member-waitlisted-second');
    `)
  })

  afterEach(() => database.close())

  function insertRegistration(
    id: string,
    memberId: string,
    status: 'confirmed' | 'waitlisted',
    registeredAt: string,
  ) {
    database
      .prepare(
        `insert into event_registration (
          id,
          community_id,
          event_id,
          member_id,
          status,
          registered_at,
          updated_at
        ) values (?, 'community', 'event', ?, ?, ?, ?)`,
      )
      .run(id, memberId, status, registeredAt, registeredAt)
  }

  it('promotes the oldest waitlisted member when a confirmed place is released', () => {
    insertRegistration(
      'registration-confirmed',
      'member-confirmed',
      'confirmed',
      '2026-09-08T10:00:00.000Z',
    )
    insertRegistration(
      'registration-waitlisted-first',
      'member-waitlisted-first',
      'waitlisted',
      '2026-09-08T10:01:00.000Z',
    )
    insertRegistration(
      'registration-waitlisted-second',
      'member-waitlisted-second',
      'waitlisted',
      '2026-09-08T10:02:00.000Z',
    )

    database
      .prepare(
        `update event_registration
        set status = 'cancelled', updated_at = ?
        where id = 'registration-confirmed'`,
      )
      .run('2026-09-08T11:00:00.000Z')

    expect(
      database
        .prepare(
          `select member_id, status, updated_at
          from event_registration
          order by registered_at asc`,
        )
        .all(),
    ).toEqual([
      {
        member_id: 'member-confirmed',
        status: 'cancelled',
        updated_at: '2026-09-08T11:00:00.000Z',
      },
      {
        member_id: 'member-waitlisted-first',
        status: 'confirmed',
        updated_at: '2026-09-08T11:00:00.000Z',
      },
      {
        member_id: 'member-waitlisted-second',
        status: 'waitlisted',
        updated_at: '2026-09-08T10:02:00.000Z',
      },
    ])
  })

  it('does not promote anyone when a waitlisted registration is cancelled', () => {
    insertRegistration(
      'registration-waitlisted-first',
      'member-waitlisted-first',
      'waitlisted',
      '2026-09-08T10:01:00.000Z',
    )
    insertRegistration(
      'registration-waitlisted-second',
      'member-waitlisted-second',
      'waitlisted',
      '2026-09-08T10:02:00.000Z',
    )

    database
      .prepare(
        `update event_registration
        set status = 'cancelled', updated_at = ?
        where id = 'registration-waitlisted-first'`,
      )
      .run('2026-09-08T11:00:00.000Z')

    expect(
      database
        .prepare(
          `select member_id, status
          from event_registration
          order by registered_at asc`,
        )
        .all(),
    ).toEqual([
      { member_id: 'member-waitlisted-first', status: 'cancelled' },
      { member_id: 'member-waitlisted-second', status: 'waitlisted' },
    ])
  })
})
