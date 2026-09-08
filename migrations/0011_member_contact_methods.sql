alter table "community_member" add column "contact_methods" text not null default '[]'
  check (json_valid("contact_methods") and json_type("contact_methods") = 'array');
