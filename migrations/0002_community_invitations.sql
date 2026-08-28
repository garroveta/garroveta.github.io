create table "community" (
  "id" text not null primary key,
  "name" text not null,
  "slug" text not null unique,
  "city" text not null,
  "access_policy" text not null default 'invitation_only'
    check ("access_policy" in ('invitation_only')),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (length(trim("name")) between 1 and 120),
  check (length(trim("slug")) between 1 and 80),
  check (length(trim("city")) between 1 and 120)
);

create table "community_member" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "user_id" text not null
    references "user" ("id") on delete cascade,
  "display_name" text not null,
  "role" text not null default 'player'
    check ("role" in ('player', 'manager', 'moderator')),
  "status" text not null default 'approved'
    check ("status" in ('approved', 'pending', 'suspended')),
  "favorite_game_ids" text not null default '[]'
    check (json_valid("favorite_game_ids") and json_type("favorite_game_ids") = 'array'),
  "tag_ids" text not null default '[]'
    check (json_valid("tag_ids") and json_type("tag_ids") = 'array'),
  "joined_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique ("community_id", "user_id"),
  check (length(trim("display_name")) between 1 and 80)
);

create index "community_member_user_id_idx"
  on "community_member" ("user_id");

create index "community_member_management_idx"
  on "community_member" ("community_id", "status", "role");

create table "community_invitation" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "token_hash" text not null unique,
  "created_by_member_id" text not null
    references "community_member" ("id") on delete restrict,
  "label" text,
  "expires_at" text not null,
  "revoked_at" text,
  "revoked_by_member_id" text
    references "community_member" ("id") on delete set null,
  "used_at" text,
  "used_by_user_id" text
    references "user" ("id") on delete set null,
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (
    length("token_hash") = 64
    and "token_hash" not glob '*[^0-9a-f]*'
  ),
  check (
    "label" is null
    or length(trim("label")) between 1 and 120
  ),
  check ("expires_at" > "created_at"),
  check ("revoked_at" is not null or "revoked_by_member_id" is null),
  check ("used_at" is not null or "used_by_user_id" is null),
  check ("revoked_at" is null or "used_at" is null)
);

create index "community_invitation_list_idx"
  on "community_invitation" ("community_id", "created_at" desc);

create index "community_invitation_active_idx"
  on "community_invitation" ("community_id", "expires_at")
  where "revoked_at" is null and "used_at" is null;

create index "community_invitation_used_by_user_idx"
  on "community_invitation" ("used_by_user_id")
  where "used_by_user_id" is not null;

insert into "community" ("id", "name", "slug", "city")
values ('community-crc-delorean', 'CRC Delorean', 'crc-delorean', 'Inca');
