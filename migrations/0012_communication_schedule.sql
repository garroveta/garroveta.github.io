alter table "community_communication" add column "expires_at" text;

create index "community_communication_schedule_idx"
  on "community_communication" ("community_id", "published_at", "expires_at");
