create table "community_event_registration_rule" (
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "event_type" text not null
    check ("event_type" in ('tournament', 'league', 'draft', 'casual', 'workshop', 'launch')),
  "enabled_by_default" integer not null
    check ("enabled_by_default" in (0, 1)),
  "default_capacity" integer not null
    check ("default_capacity" between 1 and 500),
  "waitlist_enabled" integer not null
    check ("waitlist_enabled" in (0, 1)),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key ("community_id", "event_type")
);

insert into "community_event_registration_rule"
  ("community_id", "event_type", "enabled_by_default", "default_capacity", "waitlist_enabled")
values
  ('community-crc-delorean', 'tournament', 0, 24, 1),
  ('community-crc-delorean', 'league', 0, 24, 1),
  ('community-crc-delorean', 'draft', 1, 8, 1),
  ('community-crc-delorean', 'casual', 0, 24, 0),
  ('community-crc-delorean', 'workshop', 0, 12, 0),
  ('community-crc-delorean', 'launch', 1, 30, 1);
