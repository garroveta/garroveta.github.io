-- Importación idempotente de los calendarios semanales de CRC DeLorean.
-- Periodo cubierto: del 1 de julio al 23 de agosto de 2026 (71 eventos).
--
-- Las horas de los carteles están expresadas en la hora local de Inca
-- (Europe/Madrid, UTC+02:00 en estas fechas) y se guardan en UTC.
-- Las imágenes son la fuente de los datos, no carteles individuales; por eso
-- image_uri se deja vacío. Tampoco se inventan duración, aforo o inscripciones.
-- Los eventos ya terminados se importan como completed.
--
-- No se importan los días de cierre, los horarios de apertura, las promociones
-- sin actividad asociada ni el logotipo genérico Friday Night Magic cuando el
-- mismo bloque ya contiene un FNM con formato definido.
--
-- Requisito: debe existir al menos un miembro manager aprobado en la comunidad.
-- Si falta, la restricción NOT NULL de created_by_member_id detiene la importación.
--
-- Local:
--   npm run db:events:summer-2026:local
-- Producción (solo tras revisar la previsualización y con autorización explícita):
--   npm run db:events:summer-2026:remote

with source (
  id,
  game_id,
  format_id,
  competition_event_kind_id,
  type,
  title,
  description,
  starts_at,
  counts_for_community_ranking,
  tag_ids
) as (
  values
    -- Semana del 29 de junio al 5 de julio
    ('event-store-championship-one-piece-2026-07-01', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-07-01T15:30:00.000Z', 0, '[]'),
    ('event-standard-showdown-2026-07-01', 'game-mtg', 'format-mtg-standard', null, 'tournament', 'Standard Showdown', 'Torneo de Magic: The Gathering en formato Standard.', '2026-07-01T15:30:00.000Z', 1, '["tag-standard"]'),
    ('event-mesa-de-pintura-2026-07-02', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-07-02T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-07-02', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-07-02T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-pauper-2026-07-03', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-07-03T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-fnm-duel-commander-2026-07-03', 'game-mtg', 'format-mtg-duel-commander', 'event-kind-fnm', 'tournament', 'FNM Duel Commander', 'Friday Night Magic en formato Duel Commander.', '2026-07-03T16:00:00.000Z', 1, '["tag-commander"]'),
    ('event-win-a-box-one-piece-2026-07-04', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-win-a-box', 'tournament', 'Win a Box One Piece OP-16', 'Torneo Win a Box de One Piece Card Game OP-16.', '2026-07-04T08:00:00.000Z', 0, '[]'),
    ('event-liga-warhammer-40k-jornada-2-2026-07-04', 'game-warhammer-40k', null, null, 'league', 'Liga 40K · Jornada 2', 'Segunda jornada de la liga de Warhammer 40,000.', '2026-07-04T15:00:00.000Z', 0, '[]'),
    ('event-torneo-warhammer-40k-11-edicion-2026-07-05', 'game-warhammer-40k', 'format-warhammer-2000', null, 'tournament', 'Torneo 40K 11.ª edición', 'Torneo de Warhammer 40,000 a 2.000 puntos. Precio anunciado: 15 €. Plazas limitadas.', '2026-07-05T09:00:00.000Z', 0, '[]'),

    -- Semana del 6 al 12 de julio
    ('event-store-championship-one-piece-2026-07-08', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-07-08T15:30:00.000Z', 0, '[]'),
    ('event-standard-showdown-2026-07-08', 'game-mtg', 'format-mtg-standard', null, 'tournament', 'Standard Showdown', 'Torneo de Magic: The Gathering en formato Standard.', '2026-07-08T15:30:00.000Z', 1, '["tag-standard"]'),
    ('event-mesa-de-pintura-2026-07-09', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-07-09T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-07-09', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-07-09T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-pauper-2026-07-10', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-07-10T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-store-championship-gundam-2026-07-10', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-07-10T16:00:00.000Z', 0, '[]'),
    ('event-win-a-box-duel-commander-2026-07-11', 'game-mtg', 'format-mtg-duel-commander', 'event-kind-win-a-box', 'tournament', 'Win a Box Duel Commander', 'Torneo Win a Box en formato Duel Commander.', '2026-07-11T15:00:00.000Z', 1, '["tag-commander"]'),
    ('event-liga-warhammer-40k-jornada-2-2026-07-11', 'game-warhammer-40k', null, null, 'league', 'Liga 40K · Jornada 2', 'Segunda jornada de la liga de Warhammer 40,000.', '2026-07-11T15:00:00.000Z', 0, '[]'),
    ('event-big-modern-2026-07-12', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Big Modern', 'Torneo de Magic: The Gathering en formato Modern.', '2026-07-12T15:00:00.000Z', 1, '["tag-modern"]'),

    -- Semana del 13 al 19 de julio
    ('event-store-championship-one-piece-2026-07-15', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-07-15T15:30:00.000Z', 0, '[]'),
    ('event-standard-showdown-2026-07-15', 'game-mtg', 'format-mtg-standard', null, 'tournament', 'Standard Showdown', 'Torneo de Magic: The Gathering en formato Standard.', '2026-07-15T15:30:00.000Z', 1, '["tag-standard"]'),
    ('event-mesa-de-pintura-2026-07-16', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-07-16T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-07-16', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-07-16T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-duel-commander-2026-07-17', 'game-mtg', 'format-mtg-duel-commander', 'event-kind-fnm', 'tournament', 'FNM Duel Commander', 'Friday Night Magic en formato Duel Commander.', '2026-07-17T16:00:00.000Z', 1, '["tag-commander"]'),
    ('event-liga-warhammer-40k-jornada-3-2026-07-18', 'game-warhammer-40k', null, null, 'league', 'Liga 40K · Jornada 3', 'Tercera jornada de la liga de Warhammer 40,000.', '2026-07-18T15:00:00.000Z', 0, '[]'),
    ('event-win-a-box-pauper-2026-07-18', 'game-mtg', 'format-mtg-pauper', 'event-kind-win-a-box', 'tournament', 'Win a Box Pauper', 'Torneo Win a Box en formato Pauper.', '2026-07-18T15:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-megapartida-40k-2026-07-19', 'game-warhammer-40k', null, null, 'casual', 'Megapartida 40K', 'Partida multitudinaria de Warhammer 40,000.', '2026-07-19T08:00:00.000Z', 0, '[]'),

    -- Semana del 20 al 26 de julio
    ('event-store-championship-dragon-ball-2026-07-22', 'game-dragon-ball', 'format-dragon-ball-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Dragon Ball', 'Store Championship de Dragon Ball Super Card Game.', '2026-07-22T15:30:00.000Z', 0, '[]'),
    ('event-store-championship-gundam-2026-07-22', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-07-22T15:30:00.000Z', 0, '[]'),
    ('event-mesa-de-pintura-2026-07-23', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-07-23T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-07-23', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-07-23T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-pauper-2026-07-24', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-07-24T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-store-championship-gundam-2026-07-24', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-07-24T16:00:00.000Z', 0, '[]'),
    ('event-liga-warhammer-40k-jornada-4-2026-07-25', 'game-warhammer-40k', null, null, 'league', 'Liga 40K · Jornada 4', 'Cuarta jornada de la liga de Warhammer 40,000.', '2026-07-25T15:00:00.000Z', 0, '[]'),
    ('event-win-a-box-commander-dos-cabezas-2026-07-25', 'game-mtg', 'format-mtg-two-headed-giant-commander', 'event-kind-win-a-box', 'tournament', 'Win a Box Commander Precon Dos Cabezas', 'Torneo Win a Box por parejas con mazos preconstruidos de Commander.', '2026-07-25T15:00:00.000Z', 1, '["tag-commander"]'),

    -- Semana del 27 de julio al 2 de agosto
    ('event-store-championship-dragon-ball-2026-07-29', 'game-dragon-ball', 'format-dragon-ball-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Dragon Ball', 'Store Championship de Dragon Ball Super Card Game.', '2026-07-29T15:30:00.000Z', 0, '[]'),
    ('event-store-championship-gundam-2026-07-29', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-07-29T15:30:00.000Z', 0, '[]'),
    ('event-mesa-de-pintura-2026-07-30', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-07-30T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-07-30', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-07-30T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-pauper-2026-07-31', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-07-31T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-store-championship-gundam-2026-07-31', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-07-31T16:00:00.000Z', 0, '[]'),
    ('event-store-championship-one-piece-2026-08-01', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-01T08:00:00.000Z', 0, '[]'),
    ('event-draft-night-marvel-2026-08-01', 'game-mtg', 'format-mtg-draft', 'event-kind-draft-night', 'draft', 'Draft Night Marvel', 'Draft Night de Magic: The Gathering ambientado en Marvel.', '2026-08-01T15:00:00.000Z', 1, '["tag-draft"]'),

    -- Semana del 3 al 9 de agosto
    ('event-store-championship-one-piece-2026-08-05', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-05T15:30:00.000Z', 0, '[]'),
    ('event-store-championship-gundam-2026-08-05', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-05T15:30:00.000Z', 0, '[]'),
    ('event-mesa-de-pintura-2026-08-06', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-08-06T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-08-06', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-08-06T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-commander-dos-cabezas-2026-08-07', 'game-mtg', 'format-mtg-two-headed-giant-commander', 'event-kind-fnm', 'tournament', 'FNM Commander Dos Cabezas', 'Friday Night Magic en formato Commander por parejas.', '2026-08-07T16:00:00.000Z', 1, '["tag-commander"]'),
    ('event-fnm-pauper-2026-08-07', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-08-07T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-store-championship-gundam-2026-08-07', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-07T16:00:00.000Z', 0, '[]'),
    ('event-store-championship-one-piece-2026-08-08', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-08T08:00:00.000Z', 0, '[]'),
    ('event-presentacion-mtg-hobbit-2026-08-08', 'game-mtg', 'format-mtg-sealed', 'event-kind-prerelease', 'launch', 'Presentación MTG del Hobbit', 'Presentación de Magic: The Gathering dedicada a El Hobbit.', '2026-08-08T15:00:00.000Z', 1, '["tag-draft"]'),
    ('event-torneo-age-of-sigmar-2026-08-09', 'game-age-of-sigmar', null, null, 'tournament', 'Torneo Age of Sigmar', 'Torneo de Warhammer: Age of Sigmar. Precio anunciado: 15 €; incluye kit de torneo de Games Workshop.', '2026-08-09T07:00:00.000Z', 0, '[]'),
    ('event-torneo-premodern-2026-08-09', 'game-mtg', 'format-mtg-premodern', null, 'tournament', 'Torneo Premodern', 'Torneo de Magic: The Gathering en formato Premodern.', '2026-08-09T08:00:00.000Z', 1, '[]'),

    -- Semana del 10 al 16 de agosto
    ('event-store-championship-one-piece-2026-08-12', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-12T15:30:00.000Z', 0, '[]'),
    ('event-store-championship-gundam-2026-08-12', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-12T15:30:00.000Z', 0, '[]'),
    ('event-mesa-de-pintura-2026-08-13', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-08-13T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-08-13', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-08-13T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-commander-bracket3-restricted-2026-08-14', 'game-mtg', 'format-mtg-commander', 'event-kind-fnm', 'tournament', 'FNM Commander Bracket 3 Restricted', 'Friday Night Magic de Commander con nivel Bracket 3 Restricted.', '2026-08-14T16:00:00.000Z', 1, '["tag-commander"]'),
    ('event-store-championship-gundam-2026-08-14', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-14T16:00:00.000Z', 0, '[]'),
    ('event-store-championship-one-piece-2026-08-15', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-15T08:00:00.000Z', 0, '[]'),
    ('event-win-a-box-pauper-2026-08-15', 'game-mtg', 'format-mtg-pauper', 'event-kind-win-a-box', 'tournament', 'Win a Box Pauper', 'Torneo Win a Box en formato Pauper.', '2026-08-15T15:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-megapartida-40k-2026-08-16', 'game-warhammer-40k', null, null, 'casual', 'Megapartida 40K', 'Partida multitudinaria de Warhammer 40,000.', '2026-08-16T08:00:00.000Z', 0, '[]'),

    -- Semana del 17 al 23 de agosto
    ('event-store-championship-one-piece-2026-08-19', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-19T15:30:00.000Z', 0, '[]'),
    ('event-store-championship-gundam-2026-08-19', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-19T15:30:00.000Z', 0, '[]'),
    ('event-mesa-de-pintura-2026-08-20', 'game-general', null, null, 'workshop', 'Mesa de pintura', 'Sesión abierta de pintura de miniaturas.', '2026-08-20T15:00:00.000Z', 0, '[]'),
    ('event-torneo-modern-2026-08-20', 'game-mtg', 'format-mtg-modern', null, 'tournament', 'Torneo Modern', 'Torneo semanal de Magic: The Gathering en formato Modern.', '2026-08-20T16:00:00.000Z', 1, '["tag-modern"]'),
    ('event-fnm-pauper-2026-08-21', 'game-mtg', 'format-mtg-pauper', 'event-kind-fnm', 'tournament', 'FNM Pauper', 'Friday Night Magic en formato Pauper.', '2026-08-21T16:00:00.000Z', 1, '["tag-pauper"]'),
    ('event-store-championship-gundam-2026-08-21', 'game-gundam', 'format-gundam-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship Gundam', 'Store Championship de Gundam Card Game.', '2026-08-21T16:00:00.000Z', 0, '[]'),
    ('event-store-championship-one-piece-2026-08-22', 'game-one-piece', 'format-one-piece-constructed', 'event-kind-store-championship', 'tournament', 'Store Championship One Piece', 'Store Championship de One Piece Card Game.', '2026-08-22T08:00:00.000Z', 0, '[]'),
    ('event-modern-win-a-box-2026-08-22', 'game-mtg', 'format-mtg-modern', 'event-kind-win-a-box', 'tournament', 'Modern Win a Box', 'Torneo Win a Box en formato Modern.', '2026-08-22T15:00:00.000Z', 1, '["tag-modern"]'),
    ('event-torneo-bms-40k-11-edicion-2026-08-23', 'game-warhammer-40k', 'format-warhammer-2000', null, 'tournament', 'Torneo BMS 40K 11.ª edición', 'Torneo de Warhammer 40,000 a 2.000 puntos. Precio anunciado: 15 €. Plazas limitadas.', '2026-08-23T07:00:00.000Z', 0, '[]')
)
insert into community_event (
  id,
  community_id,
  game_id,
  format_id,
  competition_event_kind_id,
  type,
  title,
  description,
  image_uri,
  starts_at,
  ends_at,
  listed_in_agenda,
  counts_for_community_ranking,
  registration_enabled,
  waitlist_enabled,
  capacity,
  status,
  tag_ids,
  created_by_member_id
)
select
  source.id,
  'community-crc-delorean',
  source.game_id,
  source.format_id,
  source.competition_event_kind_id,
  source.type,
  source.title,
  source.description,
  null,
  source.starts_at,
  null,
  1,
  source.counts_for_community_ranking,
  0,
  0,
  0,
  'completed',
  source.tag_ids,
  (
    select member.id
    from community_member member
    where member.community_id = 'community-crc-delorean'
      and member.role = 'manager'
      and member.status = 'approved'
    order by member.created_at asc, member.id asc
    limit 1
  )
from source
where true
on conflict (id) do update set
  game_id = excluded.game_id,
  format_id = excluded.format_id,
  competition_event_kind_id = excluded.competition_event_kind_id,
  type = excluded.type,
  title = excluded.title,
  description = excluded.description,
  image_uri = excluded.image_uri,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  listed_in_agenda = excluded.listed_in_agenda,
  counts_for_community_ranking = excluded.counts_for_community_ranking,
  registration_enabled = excluded.registration_enabled,
  waitlist_enabled = excluded.waitlist_enabled,
  capacity = excluded.capacity,
  status = excluded.status,
  tag_ids = excluded.tag_ids,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- Resumen visible al ejecutar el archivo. En una base vacía para este periodo,
-- el total esperado es 71; los grupos semanales esperados son 9, 9, 8, 8, 8,
-- 11, 9 y 9.
select
  substr(date(starts_at, '+2 hours'), 1, 10) as local_date,
  count(*) as event_count
from community_event
where community_id = 'community-crc-delorean'
  and starts_at >= '2026-07-01T00:00:00.000Z'
  and starts_at < '2026-08-24T00:00:00.000Z'
group by local_date
order by local_date;
