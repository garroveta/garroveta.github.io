create table "community_ranking_season" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "name" text not null
    check (length(trim("name")) between 1 and 80),
  "starts_on" text not null
    check ("starts_on" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "ends_on" text not null
    check ("ends_on" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "status" text not null default 'upcoming'
    check ("status" in ('upcoming', 'active', 'closed')),
  "points_first" integer not null check ("points_first" between 0 and 100),
  "points_second" integer not null check ("points_second" between 0 and 100),
  "points_third" integer not null check ("points_third" between 0 and 100),
  "points_fourth" integer not null check ("points_fourth" between 0 and 100),
  "points_fifth" integer not null check ("points_fifth" between 0 and 100),
  "points_sixth_to_tenth" integer not null
    check ("points_sixth_to_tenth" between 0 and 100),
  "points_participation" integer not null
    check ("points_participation" between 0 and 100),
  "eligible_member_ids" text
    check (
      "eligible_member_ids" is null
      or (json_valid("eligible_member_ids") and json_type("eligible_member_ids") = 'array')
    ),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check ("starts_on" <= "ends_on"),
  check ("status" != 'closed' or "eligible_member_ids" is not null)
);

create index "community_ranking_season_community_idx"
  on "community_ranking_season" ("community_id", "status");

create unique index "community_ranking_season_active_uidx"
  on "community_ranking_season" ("community_id")
  where "status" = 'active';
