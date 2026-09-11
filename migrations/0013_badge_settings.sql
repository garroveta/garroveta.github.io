-- Badge names and thresholds are overrides on the catalogue shipped in code:
-- '[]' means "use the defaults". A closed season keeps the full list it was
-- played under, so a later change of settings can never take a badge back.
alter table "community" add column "badge_settings" text not null default '[]'
  check (json_valid("badge_settings") and json_type("badge_settings") = 'array');

alter table "community_ranking_season" add column "badges" text
  check ("badges" is null or (json_valid("badges") and json_type("badges") = 'array'));

-- Seasons closed before badges existed are frozen at the catalogue as shipped
-- with this migration. The invariant "closed => badges not null" is enforced by
-- the Worker: adding it as a table check would need a rebuild, and dropping the
-- table would fire "on delete set null" on event_standing.ranking_season_id.
update "community_ranking_season"
set "badges" = '[{"id":"vigilance","name":"Vigilance","target":6},{"id":"persist","name":"Persist","target":15},{"id":"saga","name":"Saga","target":30},{"id":"ferocious","name":"Ferocious","target":4},{"id":"citys-blessing","name":"City''s Blessing","target":10},{"id":"prowess","name":"Prowess","target":3},{"id":"storm","name":"Storm","target":6},{"id":"deathtouch","name":"Deathtouch","target":3},{"id":"annihilator","name":"Annihilator","target":6},{"id":"legendary","name":"Legendary","target":10},{"id":"delirium","name":"Delirium","target":4},{"id":"domain","name":"Domain","target":5},{"id":"changeling","name":"Changeling","target":2},{"id":"melee","name":"Melee","target":1},{"id":"paragon","name":"Paragon"},{"id":"monarch","name":"Monarch"}]',
    "updated_at" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
where "status" = 'closed' and "badges" is null;
