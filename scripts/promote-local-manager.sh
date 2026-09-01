#!/usr/bin/env bash
# Développement local uniquement : rend gérant, sur la communauté du
# prototype, le compte qui s'est déjà connecté une fois par OTP avec cet
# e-mail. Sans effet en remote.
set -euo pipefail

EMAIL="${1:?Usage: npm run db:promote:local -- vous@exemple.com}"

npx wrangler d1 execute garroveta-production --local --command "
insert into community_member (
  id, community_id, user_id, display_name, role, status,
  favorite_game_ids, tag_ids, joined_at, created_at, updated_at
)
select
  lower(hex(randomblob(16))), 'community-crc-delorean', u.id,
  'Gérant local', 'manager', 'approved', '[]', '[]',
  datetime('now'), datetime('now'), datetime('now')
from user u
where u.email = '${EMAIL}'
on conflict (community_id, user_id) do update set
  role = 'manager',
  status = 'approved',
  updated_at = datetime('now');
"
