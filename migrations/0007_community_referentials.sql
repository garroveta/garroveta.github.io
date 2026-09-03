create table "community_game" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "name" text not null,
  "normalized_name" text not null,
  "short_name" text not null,
  "category" text not null
    check ("category" in ('card_game', 'miniatures', 'role_playing_game')),
  "color" text not null,
  "is_active" integer not null default 1
    check ("is_active" in (0, 1)),
  "sort_order" integer not null default 0
    check ("sort_order" >= 0),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique ("community_id", "normalized_name"),
  unique ("community_id", "id"),
  check (length(trim("name")) between 1 and 80),
  check (length(trim("normalized_name")) between 1 and 80),
  check (length(trim("short_name")) between 1 and 40),
  check (
    length("color") = 7
    and "color" glob '#*'
    and substr("color", 2) not glob '*[^0-9A-Fa-f]*'
  )
);

create index "community_game_list_idx"
  on "community_game" ("community_id", "sort_order", "name", "id");

create table "community_format" (
  "id" text not null primary key,
  "community_id" text not null,
  "game_id" text not null,
  "name" text not null,
  "normalized_name" text not null,
  "short_name" text not null,
  "color" text not null,
  "is_active" integer not null default 1
    check ("is_active" in (0, 1)),
  "sort_order" integer not null default 0
    check ("sort_order" >= 0),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  foreign key ("community_id") references "community" ("id") on delete cascade,
  foreign key ("community_id", "game_id")
    references "community_game" ("community_id", "id") on delete restrict,
  unique ("community_id", "game_id", "normalized_name"),
  unique ("community_id", "id"),
  check (length(trim("name")) between 1 and 80),
  check (length(trim("normalized_name")) between 1 and 80),
  check (length(trim("short_name")) between 1 and 40),
  check (
    length("color") = 7
    and "color" glob '#*'
    and substr("color", 2) not glob '*[^0-9A-Fa-f]*'
  )
);

create index "community_format_list_idx"
  on "community_format" ("community_id", "game_id", "sort_order", "name", "id");

create table "community_event_series" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "name" text not null,
  "normalized_name" text not null,
  "short_name" text not null,
  "is_active" integer not null default 1
    check ("is_active" in (0, 1)),
  "sort_order" integer not null default 0
    check ("sort_order" >= 0),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique ("community_id", "normalized_name"),
  unique ("community_id", "id"),
  check (length(trim("name")) between 1 and 80),
  check (length(trim("normalized_name")) between 1 and 80),
  check (length(trim("short_name")) between 1 and 40)
);

create index "community_event_series_list_idx"
  on "community_event_series" ("community_id", "sort_order", "name", "id");

create table "community_tag" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "name" text not null,
  "normalized_name" text not null,
  "kind" text not null
    check ("kind" in ('interest', 'communication')),
  "color" text not null,
  "is_active" integer not null default 1
    check ("is_active" in (0, 1)),
  "sort_order" integer not null default 0
    check ("sort_order" >= 0),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique ("community_id", "normalized_name"),
  unique ("community_id", "id"),
  check (length(trim("name")) between 1 and 80),
  check (length(trim("normalized_name")) between 1 and 80),
  check (
    length("color") = 7
    and "color" glob '#*'
    and substr("color", 2) not glob '*[^0-9A-Fa-f]*'
  )
);

create index "community_tag_list_idx"
  on "community_tag" ("community_id", "sort_order", "name", "id");

insert into "community_game"
  ("id", "community_id", "name", "normalized_name", "short_name", "category", "color", "sort_order")
values
  ('game-mtg', 'community-crc-delorean', 'Magic: The Gathering', 'magic: the gathering', 'MTG', 'card_game', '#b14f2f', 0),
  ('game-one-piece', 'community-crc-delorean', 'One Piece Card Game', 'one piece card game', 'One Piece', 'card_game', '#b33b3b', 1),
  ('game-dragon-ball', 'community-crc-delorean', 'Dragon Ball Super Card Game', 'dragon ball super card game', 'Dragon Ball', 'card_game', '#d37a24', 2),
  ('game-gundam', 'community-crc-delorean', 'Gundam Card Game', 'gundam card game', 'Gundam', 'card_game', '#3569a8', 3),
  ('game-warhammer-40k', 'community-crc-delorean', 'Warhammer 40,000', 'warhammer 40,000', 'Warhammer 40K', 'miniatures', '#53616d', 4),
  ('game-dungeons-dragons', 'community-crc-delorean', 'Dungeons & Dragons', 'dungeons & dragons', 'D&D', 'role_playing_game', '#7f3540', 5),
  ('game-age-of-sigmar', 'community-crc-delorean', 'Warhammer: Age of Sigmar', 'warhammer: age of sigmar', 'Age of Sigmar', 'miniatures', '#8a7a3f', 6),
  ('game-general', 'community-crc-delorean', 'Actividad general', 'actividad general', 'General', 'miniatures', '#6b6b6b', 7);

insert into "community_format"
  ("id", "community_id", "game_id", "name", "normalized_name", "short_name", "color", "sort_order")
values
  ('format-mtg-pauper', 'community-crc-delorean', 'game-mtg', 'Pauper', 'pauper', 'Pauper', '#8a6732', 0),
  ('format-mtg-standard', 'community-crc-delorean', 'game-mtg', 'Standard', 'standard', 'Standard', '#416a80', 1),
  ('format-mtg-modern', 'community-crc-delorean', 'game-mtg', 'Modern', 'modern', 'Modern', '#315f73', 2),
  ('format-mtg-sealed', 'community-crc-delorean', 'game-mtg', 'Sellado', 'sellado', 'Sellado', '#8b4d2f', 3),
  ('format-mtg-draft', 'community-crc-delorean', 'game-mtg', 'Draft', 'draft', 'Draft', '#75426e', 4),
  ('format-mtg-commander', 'community-crc-delorean', 'game-mtg', 'Commander', 'commander', 'Commander', '#6d3d7d', 5),
  ('format-mtg-duel-commander', 'community-crc-delorean', 'game-mtg', 'Duel Commander', 'duel commander', 'Duel Commander', '#543c7d', 6),
  ('format-mtg-two-headed-giant-commander', 'community-crc-delorean', 'game-mtg', 'Commander Two-Headed Giant', 'commander two-headed giant', '2HG Commander', '#4c527f', 7),
  ('format-mtg-premodern', 'community-crc-delorean', 'game-mtg', 'Premodern', 'premodern', 'Premodern', '#5c4a33', 8),
  ('format-one-piece-constructed', 'community-crc-delorean', 'game-one-piece', 'Construido', 'construido', 'Construido', '#b33b3b', 9),
  ('format-gundam-constructed', 'community-crc-delorean', 'game-gundam', 'Construido', 'construido', 'Construido', '#3569a8', 10),
  ('format-dragon-ball-constructed', 'community-crc-delorean', 'game-dragon-ball', 'Construido', 'construido', 'Construido', '#d37a24', 11),
  ('format-warhammer-2000', 'community-crc-delorean', 'game-warhammer-40k', '2.000 puntos', '2.000 puntos', '2.000 pts', '#53616d', 12);

insert into "community_event_series"
  ("id", "community_id", "name", "normalized_name", "short_name", "sort_order")
values
  ('event-kind-fnm', 'community-crc-delorean', 'Friday Night Magic', 'friday night magic', 'FNM', 0),
  ('event-kind-prerelease', 'community-crc-delorean', 'Presentación', 'presentacion', 'Presentación', 1),
  ('event-kind-draft-night', 'community-crc-delorean', 'Draft Night', 'draft night', 'Draft Night', 2),
  ('event-kind-store-championship', 'community-crc-delorean', 'Store Championship', 'store championship', 'Store Championship', 3),
  ('event-kind-win-a-box', 'community-crc-delorean', 'Win a Box', 'win a box', 'Win a Box', 4);

insert into "community_tag"
  ("id", "community_id", "name", "normalized_name", "kind", "color", "sort_order")
values
  ('tag-commander', 'community-crc-delorean', 'Commander', 'commander', 'interest', '#6d3d7d', 0),
  ('tag-modern', 'community-crc-delorean', 'Modern', 'modern', 'interest', '#315f73', 1),
  ('tag-pauper', 'community-crc-delorean', 'Pauper', 'pauper', 'interest', '#6d5a36', 2),
  ('tag-standard', 'community-crc-delorean', 'Standard', 'standard', 'interest', '#416a80', 3),
  ('tag-draft', 'community-crc-delorean', 'Draft', 'draft', 'interest', '#8b4d2f', 4),
  ('tag-principiantes', 'community-crc-delorean', 'Principiantes', 'principiantes', 'interest', '#2f6b59', 5),
  ('tag-intercambios', 'community-crc-delorean', 'Intercambios', 'intercambios', 'interest', '#5b4b8c', 6),
  ('tag-promociones', 'community-crc-delorean', 'Promociones', 'promociones', 'communication', '#8a5d26', 7);
