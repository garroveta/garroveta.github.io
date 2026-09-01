create table "community_event" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "game_id" text not null,
  "format_id" text,
  "competition_event_kind_id" text,
  "type" text not null
    check ("type" in ('tournament', 'league', 'draft', 'casual', 'workshop', 'launch')),
  "title" text not null,
  "description" text not null,
  "image_uri" text,
  "starts_at" text not null,
  "ends_at" text,
  "listed_in_agenda" integer not null default 1
    check ("listed_in_agenda" in (0, 1)),
  "counts_for_community_ranking" integer not null default 0
    check ("counts_for_community_ranking" in (0, 1)),
  "registration_enabled" integer not null default 0
    check ("registration_enabled" in (0, 1)),
  "waitlist_enabled" integer not null default 0
    check ("waitlist_enabled" in (0, 1)),
  "capacity" integer not null default 0
    check ("capacity" between 0 and 500),
  "status" text not null default 'scheduled'
    check ("status" in ('scheduled', 'full', 'completed')),
  "tag_ids" text not null default '[]'
    check (json_valid("tag_ids") and json_type("tag_ids") = 'array'),
  "created_by_member_id" text not null
    references "community_member" ("id") on delete restrict,
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (length(trim("game_id")) between 1 and 100),
  check ("format_id" is null or length(trim("format_id")) between 1 and 100),
  check (
    "competition_event_kind_id" is null
    or length(trim("competition_event_kind_id")) between 1 and 100
  ),
  check (length(trim("title")) between 1 and 120),
  check (length(trim("description")) between 1 and 2000),
  check ("image_uri" is null or length("image_uri") <= 2000),
  check ("ends_at" is null or "ends_at" > "starts_at"),
  check (
    ("registration_enabled" = 0 and "capacity" = 0 and "waitlist_enabled" = 0)
    or ("registration_enabled" = 1 and "capacity" between 1 and 500)
  )
);

create index "community_event_agenda_idx"
  on "community_event" ("community_id", "listed_in_agenda", "starts_at", "id");

create index "community_event_management_idx"
  on "community_event" ("community_id", "status", "starts_at", "id");
