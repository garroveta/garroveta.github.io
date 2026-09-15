# T3 · Coincidencias como consulta

Tamaño: M · Depende de: T2 · Bloquea: T4, T6

## Objetivo

Que los avisos de coincidencia sean reales, calculados sobre las ofertas y
búsquedas de toda la comunidad, **sin ningún motor que recalcular**. La pareja
es una consulta; solo el estado (`seen`, `contacted`, `completed`) se guarda.

El diseño completo —consulta, tabla de estado, ciclo de vida, índices— está
en [`../02-plan-backend.md`](../02-plan-backend.md), secciones 2, 4, 5 y 6.
Esta tarea no lo repite: dice qué construir y cómo comprobarlo.

## Por qué así y no portando `synchronizeCardMatches`

El motor local recalcula todas las coincidencias en cada mutación. Medido:
524 ms para 4 000 ofertas × 400 búsquedas **después** de corregir un término
cuadrático, y en el navegador. En el servidor, con los datos de toda la
comunidad y en cada escritura de cualquiera, es inviable. La consulta acotada
al miembro que consulta (`where w.member_id = ?`) solo trabaja sobre sus
búsquedas.

## Alcance

- Migración con `card_match` (solo estado) y los índices de la sección 6 del
  plan.
- Endpoint de lectura: mis coincidencias, uniendo la consulta viva con las
  filas `completed` del historial.
- Endpoint de recuento para el indicador de Inicio.
- Endpoints de transición de estado: marcar como vista, marcar como
  contactada. El cierre (`completed`) es de T4.
- La pestaña «Coincidencias», el detalle de una coincidencia y el indicador de
  Inicio pasan a leer del servidor.
- **Retirada del motor local** cuando hay cuenta conectada: ninguna mutación
  de T2 llama ya a `synchronizeCardMatches` en ese modo.

## Fuera de alcance

- Cerrar una operación (T4).
- La puntuación (`score`). Se devuelve `100` constante, como hoy. La consulta
  es el sitio donde matizarla más adelante.
- Notificaciones push o por correo cuando aparece una coincidencia.

## Cambios previstos

### Migración `migrations/NNNN_card_matches.sql`

La tabla `card_match` de la sección 3 del plan, con `unique (wanted_card_id,
listing_id)` y `status` restringido a `seen`, `contacted`, `completed`.
`'new'` no existe en la tabla: **ausencia de fila = nueva**.

### Worker `worker/card-matches.ts`

| Método | Ruta                                         | Notas                                                                                         |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `me/card-matches`                            | consulta viva ∪ historial `completed`; incluye datos del vendedor y de la carta               |
| GET    | `me/card-matches/count`                      | `count(*)` de la consulta viva con `m.id is null`                                             |
| POST   | `me/card-matches/:wanted/:listing/seen`      | `insert … on conflict do nothing`; `404` si la pareja no es una coincidencia viva del miembro |
| POST   | `me/card-matches/:wanted/:listing/contacted` | `update`; `404` si no hay fila o no es del miembro                                            |

Las transiciones se identifican por la pareja `(wanted_card_id, listing_id)`,
no por un `id` de coincidencia, porque una coincidencia nueva **no tiene fila**
todavía.

El endpoint de `seen` debe verificar, antes de insertar, que la pareja está
en la consulta viva **del miembro que llama**. Si no, un miembro podría crear
filas de estado sobre coincidencias ajenas.

### Cliente e interfaz

- `src/api/cardMatches.ts`, `src/hooks/useCardMatches.ts`.
- `MatchesSection.tsx` y el detalle de coincidencia en `CardsPage.tsx` leen
  del hook. El detalle ya usa `ContactMethodList` con el vendedor; con T6 ese
  vendedor será un miembro real y el aviso de demostración desaparece.
- `HomePage.tsx`: el indicador usa el endpoint de recuento. El prop
  `cardsData` desaparece (ver T6).

## Criterios de aceptación

Cada una de las seis reglas de la sección 6 de
[`../01-estado-actual.md`](../01-estado-actual.md) tiene una prueba de worker
contra D1 local, y además:

- [ ] Una búsqueda con `match_all_printings = 1` y `oracle_id` coincide con
      cualquier impresión del mismo `oracle_id`.
- [ ] Sin `oracle_id` en alguno de los dos lados, se compara por
      `normalized_name`.
- [ ] Una oferta `reserved` **por quien busca** sigue apareciendo; una
      reservada por otro, no.
- [ ] Una oferta `withdrawn` no aparece nunca.
- [ ] Una coincidencia `completed` aparece en la lista aunque la oferta ya no
      cumpla la regla 2.
- [ ] Publicar, editar o retirar una oferta **no escribe** en `card_match`
      (comprobar con `count(*)` antes y después).
- [ ] Marcar como vista dos veces deja una sola fila; marcar como vista una
      coincidencia ya `contacted` no la degrada.
- [ ] Un miembro no puede marcar como vista una coincidencia de otro.
- [ ] El indicador de Inicio muestra el mismo número que la pestaña
      «Coincidencias» con la cuenta real conectada (esto es exactamente lo que
      falló una vez; T0 permite probarlo).

## Pruebas exigidas

- `worker/card-matches.test.ts` contra D1 local, un caso por regla y por
  criterio de arriba. Es la parte más importante de la tarea: las reglas
  salen de TypeScript y `cardMatching.test.ts` deja de protegerlas.
- Cliente y hook según el patrón.
- Integración con el banco de T0: indicador de Inicio y pestaña con feed
  real.

## Riesgos

- **Rendimiento de `match_all_printings = 1`.** Es el camino común (la
  interfaz lo marca por defecto). La denormalización de `oracle_id` y
  `normalized_name` sobre `marketplace_listing` (T2) es lo que lo hace
  indexable. Si T2 la omitió, esta tarea no puede cumplir su plazo.
- **Cambio de comportamiento asumido.** Con la tabla de estado persistente,
  una coincidencia que dejó de serlo y vuelve **recupera** su estado (`seen`),
  en lugar de reaparecer como nueva. Es mejor, pero es distinto; la doc de
  estado actual debe reflejarlo cuando esta tarea cierre.

## Preguntas abiertas

- ❓ **Filas de estado huérfanas.** Una fila `seen` cuya pareja ya no es
  compatible se queda en la tabla. Es lo que permite recuperar el estado si
  vuelve. ¿Se tolera indefinidamente, o se limpia cuando la oferta pasa a
  `completed` o se borra? Propuesta: tolerar; el `on delete cascade` ya cubre
  el borrado.
- ❓ **Recuento en cada carga de Inicio.** Es una consulta por visita al
  Inicio. Para el volumen previsto es trivial; si un día no lo fuera, el
  recuento podría cachearse por miembro con invalidación en las escrituras de
  T2. No hacerlo ahora.
