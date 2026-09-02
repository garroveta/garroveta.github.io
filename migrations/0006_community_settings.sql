alter table "community" add column "address" text;
alter table "community" add column "contact_email" text;
alter table "community" add column "contact_phone" text;
alter table "community" add column "website_url" text;
alter table "community" add column "instagram_url" text;
alter table "community" add column "facebook_url" text;
alter table "community" add column "logo_url" text;
alter table "community" add column "opening_hours" text not null default '[{"day":"monday"},{"day":"tuesday"},{"day":"wednesday"},{"day":"thursday"},{"day":"friday"},{"day":"saturday"},{"day":"sunday"}]'
  check (json_valid("opening_hours") and json_type("opening_hours") = 'array');

update "community"
set "contact_email" = 'crcdelorean@gmail.com',
    "opening_hours" = '[{"day":"monday"},{"day":"tuesday"},{"day":"wednesday","opensAt":"17:00","closesAt":"24:00"},{"day":"thursday","opensAt":"17:00","closesAt":"24:00"},{"day":"friday","opensAt":"17:00","closesAt":"01:00","closesNextDay":true},{"day":"saturday","opensAt":"09:00","closesAt":"01:00","closesNextDay":true},{"day":"sunday","opensAt":"09:00","closesAt":"23:00"}]',
    "updated_at" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
where "id" = 'community-crc-delorean';
