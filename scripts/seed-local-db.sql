-- Seed de développement local : crée la communauté du prototype
-- (identifiant identique à demoData.ts) pour pouvoir y rattacher des
-- adhésions réelles en base D1 locale. Sans effet en remote.
insert into "community" ("id", "name", "slug", "city")
values ('community-crc-delorean', 'CRC Delorean', 'crc-delorean', 'Inca')
on conflict ("id") do nothing;
