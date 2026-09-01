create table "event_registration" (
  "id" text not null primary key,
  "community_id" text not null
    references "community" ("id") on delete cascade,
  "event_id" text not null
    references "community_event" ("id") on delete cascade,
  "member_id" text not null
    references "community_member" ("id") on delete cascade,
  "status" text not null
    check ("status" in ('confirmed', 'waitlisted', 'cancelled')),
  "registered_at" text not null,
  "updated_at" text not null,
  unique ("event_id", "member_id")
);

create index "event_registration_event_status_idx"
  on "event_registration" ("event_id", "status", "registered_at", "id");

create index "event_registration_member_idx"
  on "event_registration" ("community_id", "member_id", "status");

create trigger "promote_event_waitlist_after_cancellation"
after update of "status" on "event_registration"
when old."status" = 'confirmed' and new."status" = 'cancelled'
begin
  update "event_registration"
  set "status" = 'confirmed',
      "updated_at" = new."updated_at"
  where "id" = (
    select "id"
    from "event_registration"
    where "event_id" = new."event_id"
      and "status" = 'waitlisted'
    order by "registered_at" asc, "id" asc
    limit 1
  );
end;
