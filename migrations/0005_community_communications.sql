create table "community_communication" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "author_member_id" text not null
    references "community_member" ("id") on delete restrict,
  "type" text not null
    check ("type" in ('news', 'promotion', 'arrival', 'urgent', 'poll', 'rule')),
  "title" text not null,
  "excerpt" text not null,
  "content" text not null,
  "tag_ids" text not null default '[]'
    check (json_valid("tag_ids") and json_type("tag_ids") = 'array'),
  "pinned" integer not null default 0
    check ("pinned" in (0, 1)),
  "published_at" text not null,
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (length(trim("title")) between 1 and 120),
  check (length(trim("excerpt")) between 1 and 500),
  check (length(trim("content")) between 1 and 10000)
);

create index "community_communication_feed_idx"
  on "community_communication" (
    "community_id",
    "pinned" desc,
    "published_at" desc,
    "id"
  );

create index "community_communication_author_idx"
  on "community_communication" ("community_id", "author_member_id");
