create table "event_standing" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "event_id" text not null
    references "community_event" ("id") on delete cascade,
  "ranking_season_id" text
    references "community_ranking_season" ("id") on delete set null,
  "source_kind" text not null default 'eventlink_html'
    check ("source_kind" in ('eventlink_html')),
  "source_store_id" text,
  "source_external_event_id" text,
  "source_round_number" integer
    check ("source_round_number" is null or "source_round_number" >= 1),
  "imported_at" text not null,
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique ("event_id")
);

create index "event_standing_community_idx"
  on "event_standing" ("community_id", "imported_at");

create index "event_standing_season_idx"
  on "event_standing" ("ranking_season_id");

create table "event_standing_entry" (
  "id" text not null primary key,
  "standing_id" text not null
    references "event_standing" ("id") on delete cascade,
  "member_id" text
    references "community_member" ("id") on delete set null,
  "rank" integer not null check ("rank" >= 1),
  "display_name" text not null
    check (length(trim("display_name")) between 1 and 120),
  "event_points" integer not null check ("event_points" >= 0),
  "wins" integer not null check ("wins" >= 0),
  "losses" integer not null check ("losses" >= 0),
  "draws" integer not null check ("draws" >= 0),
  "opponent_match_win_percentage" real not null
    check ("opponent_match_win_percentage" between 0 and 100),
  "game_win_percentage" real not null
    check ("game_win_percentage" between 0 and 100),
  "opponent_game_win_percentage" real not null
    check ("opponent_game_win_percentage" between 0 and 100)
);

create index "event_standing_entry_standing_idx"
  on "event_standing_entry" ("standing_id", "rank");

create unique index "event_standing_entry_member_uidx"
  on "event_standing_entry" ("standing_id", "member_id")
  where "member_id" is not null;
