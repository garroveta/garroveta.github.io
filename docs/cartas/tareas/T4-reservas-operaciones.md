# T4 · Reservas y cierre de operaciones

Tamaño: M · Depende de: T2, T3 · Bloquea: T5

## Objetivo

Que reservar una carta y dar por hecho un intercambio funcionen entre varias
personas a la vez. Es la parte de Cartas donde el prototipo local más se
aleja de la realidad: en un navegador nunca hay dos personas reservando el
último ejemplar en el mismo segundo.

## Lo que hoy hace el prototipo

Una oferta tiene **una** reserva como mucho (`reserved_by_member_id`,
`reserved_quantity`, `reserved_at`), de cantidad parcial. En cuanto hay una
reserva, la oferta pasa a `reserved`, desaparece del catálogo general y solo
sigue generando coincidencia para quien la reservó. Quien reservó y quien
ofrece pueden cancelar, entera o en parte; si no queda nada reservado, la
oferta vuelve a `available`.

Cerrar una operación es una acción del comprador desde el detalle de la
coincidencia: en un solo paso la oferta pasa a `completed`, la búsqueda a
`fulfilled`, la coincidencia a `completed` y se crea un `card_deal`. Una
misma coincidencia no se cierra dos veces.

Estas reglas se conservan. Lo que cambia es **dónde** se garantizan.

## Alcance

- Columnas de reserva en `marketplace_listing` (ya en el esquema de T2, sin
  endpoint hasta ahora) y tabla `card_deal`.
- Endpoints: reservar, cancelar o liberar una reserva (total o parcial),
  cerrar una operación.
- La hoja de reserva (`MarketplaceReservationSheet`) y el cierre desde el
  detalle de coincidencia pasan a llamar al servidor.

## Fuera de alcance

- Varias reservas simultáneas sobre la misma oferta (ver pregunta abierta).
- Caducidad automática de una reserva no atendida.
- Valoración o comentario tras el intercambio.

## Cambios previstos

### Migración `migrations/NNNN_card_deals.sql`

```sql
create table "card_deal" (
  "id" text not null primary key,
  "community_id" text not null references "community"("id") on delete cascade,
  "listing_id" text references "marketplace_listing"("id") on delete set null,
  "wanted_card_id" text references "wanted_card"("id") on delete set null,
  "buyer_member_id" text references "community_member"("id") on delete set null,
  "seller_member_id" text references "community_member"("id") on delete set null,
  "card_name" text not null,
  "buyer_display_name" text not null,
  "seller_display_name" text not null,
  "quantity" integer not null check ("quantity" >= 1),
  "price_eur" real,
  "completed_at" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Todas las referencias en `on delete set null` y los nombres **denormalizados**:
borrar una oferta, una búsqueda o dar de baja a un miembro no puede destruir
el registro de un intercambio que ocurrió.

### Worker `worker/card-reservations.ts`

| Método | Ruta                                        | Quién                     | Regla que se garantiza                                               |
| ------ | ------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| POST   | `listings/:id/reservation`                  | validado, **no** el dueño | update condicional: solo si `status = 'available'` y `quantity >= ?` |
| DELETE | `listings/:id/reservation`                  | quien reservó **o** dueño | cantidad a liberar ≤ reservada; si queda 0, vuelve a `available`     |
| POST   | `me/card-matches/:wanted/:listing/complete` | el comprador              | transacción de cuatro escrituras; `409` si ya estaba `completed`     |

**La reserva es un `update … where`, nunca un leer-modificar-escribir.** El
servidor no lee la oferta, decide y escribe: escribe con la condición en el
`where` y mira `changes()`. Si es 0, alguien se adelantó y se responde `409`.

```sql
update marketplace_listing
set status = 'reserved',
    reserved_by_member_id = ?, reserved_quantity = ?, reserved_at = ?
where id = ? and community_id = ?
  and member_id <> ?            -- el dueño no reserva lo suyo
  and status = 'available'
  and quantity >= ?
```

**Cerrar una operación es una transacción** (`env.DB.batch`) con las cuatro
escrituras y una condición de idempotencia: la fila de `card_match` debe
existir y no estar ya en `completed`. Si `batch` no ofrece la atomicidad
necesaria en algún caso, hay que decirlo en la revisión de esta tarea y no
descubrirlo después.

### Cliente e interfaz

- `src/api/cardReservations.ts`; `useMarketplaceReservation.ts` pasa a
  llamar al servidor y a recargar la oferta.
- Un `409` se traduce en la hoja de reserva a un mensaje concreto: «Otro
  miembro se ha adelantado» / «Ya no quedan tantas unidades», y la oferta se
  recarga.

## Criterios de aceptación

- [ ] Dos reservas simultáneas del último ejemplar: exactamente una tiene
      éxito y la otra recibe `409`. Se prueba lanzando las dos peticiones sin
      esperar entre ellas.
- [ ] El dueño no puede reservar su propia oferta (`404` o `409`, nunca éxito).
- [ ] Reservar 2 de 3 deja la oferta en `reserved`; liberar 1 la mantiene en
      `reserved` con 1; liberar la última la devuelve a `available`.
- [ ] Solo quien reservó o el dueño pueden cancelar; un tercero recibe `404`.
- [ ] Cerrar una operación crea **un** `card_deal` con los nombres
      denormalizados; cerrarla otra vez responde `409` y no crea nada.
- [ ] Tras cerrar, la oferta está `completed`, la búsqueda `fulfilled` y la
      coincidencia sigue visible como `completed` (T3).
- [ ] Borrar la oferta después no borra el `card_deal`.

## Pruebas exigidas

- `worker/card-reservations.test.ts` contra D1 local, incluida la carrera de
  dos reservas (dos `fetch` en `Promise.all` sobre el mismo handler).
- Cliente y hook según el patrón; la traducción del `409` en la hoja de
  reserva se prueba en `MarketplaceReservationSheet`.
- Integración con el banco de T0: reservar desde el catálogo y desde una
  coincidencia, cierre desde el detalle.

## Preguntas abiertas

- ❓ **Una reserva por oferta, o varias.** El prototipo permite una sola:
  reservar 1 de 4 saca del catálogo las otras 3. Es simple y evita el reparto,
  pero hace que un vendedor con playsets venda de uno en uno. ¿Se mantiene
  para el piloto? Propuesta: sí, y anotar «varias reservas» como evolución;
  cambiarlo después obliga a una tabla `reservation` aparte, así que conviene
  decidirlo **antes** de T2 y no después.
- ❓ **Caducidad.** Una reserva que nadie atiende bloquea la oferta para
  siempre. ¿Se limita a N días con liberación automática (sería una consulta
  con `reserved_at < ?`, sin tarea de fondo, como la caducidad de
  publicaciones)? Propuesta: no en T4; dejarlo listo en el esquema
  (`reserved_at` ya existe) y decidir con uso real.
- ❓ **Quién cierra.** Hoy solo el comprador. ¿Debería poder el vendedor?
  Propuesta: solo el comprador, que es quien recibe la carta y puede
  confirmarlo.
