# T1 · Catálogo compartido de cartas

Tamaño: S · Depende de: T0 · Bloquea: T2

## Objetivo

Que el catálogo de impresiones conocidas sea **uno para toda la comunidad**,
en D1, en lugar de crecer por separado en el navegador de cada persona. Es la
primera tabla de Cartas en el servidor y la más simple: solo lectura desde la
interfaz, escritura únicamente a través de las importaciones.

## Por qué ahora

Ofertas y búsquedas (T2) referencian una carta por su `cardId`. Si el catálogo
siguiera siendo local, dos miembros que importan la misma carta tendrían dos
`cardId` distintos y sus ofertas y búsquedas jamás coincidirían. El catálogo
compartido es un prerrequisito, no una mejora.

## Alcance

- Migración con la tabla `card`.
- Endpoint de lectura del catálogo de la comunidad.
- Endpoint de **alta idempotente**: recibe una lista de impresiones resueltas
  (el resultado de `resolveCardImportItemsWithCatalog`) y las inserta con
  `on conflict do nothing` sobre `scryfall_id`. Devuelve el `cardId` de cada
  una, exista ya o no.
- Cliente y hook siguiendo el patrón del resto de la aplicación.
- La interfaz de importación pasa a llamar al alta antes de crear ofertas o
  búsquedas, en lugar de `ensureResolvedCard` sobre la copia local.

## Fuera de alcance

- Resolver cartas contra Scryfall en el servidor. La resolución sigue en el
  cliente (`scryfallClient.ts`); el servidor solo recibe cartas ya resueltas.
- Enriquecer una carta ya existente (por ejemplo, rellenar un `oracle_id` que
  faltaba). Ver la pregunta abierta.
- Borrar cartas del catálogo. Nunca se borran.

## Cambios previstos

### Migración `migrations/NNNN_cards.sql`

```sql
create table "card" (
  "id" text not null primary key,
  "community_id" text not null references "community"("id") on delete cascade,
  "scryfall_id" text,
  "oracle_id" text,
  "name" text not null check (length(trim("name")) between 1 and 200),
  "normalized_name" text not null,
  "set_code" text not null,
  "set_name" text not null,
  "collector_number" text not null,
  "image_uri" text,
  "created_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index "card_scryfall_uidx"
  on "card" ("community_id", "scryfall_id") where "scryfall_id" is not null;
create unique index "card_printing_uidx"
  on "card" ("community_id", "set_code", "collector_number");
create index "card_oracle_idx" on "card" ("community_id", "oracle_id");
create index "card_name_idx" on "card" ("community_id", "normalized_name");
```

`normalized_name` se calcula **en el servidor** al insertar, con la misma
regla que `normalizeCardName` (sin acentos, minúsculas, sin espacios
sobrantes). No se confía en el valor que envíe el cliente.

### Worker `worker/cards.ts`

- `GET /api/communities/:id/cards` — miembro validado. Devuelve el catálogo
  completo de la comunidad, paginado si supera un umbral (ver pregunta abierta).
- `POST /api/communities/:id/cards` — miembro validado. Cuerpo: lista de
  cartas resueltas. Respuesta: la misma lista con el `cardId` asignado.
  Idempotente: enviar dos veces lo mismo no crea nada.

### Cliente

- `src/api/communityCards.ts` + prueba.
- `src/hooks/useCommunityCards.ts` + prueba, con `onLoaded` como el resto.
- `src/App.tsx`: el catálogo del feed sustituye a `data.cards` cuando hay
  cuenta conectada, con el mismo patrón que `communityMembers`.

### Datos locales

`ensureResolvedCard` y `findExactCatalogCard` (`cardMutations.ts`) se conservan
para el modo sin cuenta, pero dejan de ser el camino cuando hay sesión.

## Criterios de aceptación

- [ ] Dos miembros distintos que importan «Sol Ring (CMM) 410» obtienen el
      **mismo** `cardId`.
- [ ] Importar dos veces la misma lista no crea filas nuevas en `card`.
- [ ] Una carta sin `scryfall_id` (resuelta solo por edición y número) se
      deduplica por `(set_code, collector_number)`.
- [ ] `normalized_name` de «Jötun Grunt» es `jotun grunt`, calculado por el
      servidor aunque el cliente envíe otra cosa.
- [ ] El catálogo local sigue funcionando sin cuenta conectada.

## Pruebas exigidas

- `worker/cards.test.ts`: alta idempotente, deduplicación por ambos índices,
  normalización en servidor, rechazo de una carta sin nombre o sin edición.
- `src/api/communityCards.test.ts` y `src/hooks/useCommunityCards.test.tsx`
  según el patrón existente.
- Integración: una importación con cuenta conectada llama al alta y las
  ofertas creadas apuntan al `cardId` devuelto. Usar el banco de T0.

## Preguntas abiertas

- ❓ **Enriquecimiento.** Una carta resuelta solo por nombre no trae
  `oracle_id`; una importación posterior con `scryfall_id` sí. ¿El alta
  actualiza `oracle_id` e `image_uri` cuando estaban vacíos (`coalesce`), o se
  deja para más adelante? Propuesta: sí, solo rellenar vacíos, nunca
  sobrescribir. Afecta a la regla 4 del emparejamiento (T3).
- ❓ **Tamaño del catálogo.** ¿Paginar `GET /cards` desde el principio o
  devolverlo entero hasta que duela? Con 20 vendedores × 1 000 ofertas puede
  rondar las 10 000 impresiones distintas. Propuesta: sin paginar en T1,
  con un `limit` alto y un aviso en el log si se alcanza.
- ❓ **`community_id` en `card`.** ¿El catálogo es por comunidad o global? Hoy
  solo hay una comunidad. Por comunidad es más simple de autorizar; global
  ahorra filas. Propuesta: por comunidad, coherente con el resto del esquema.
