# T2 · Ofertas, búsquedas y listas personales

Tamaño: L · Depende de: T0, T1 · Bloquea: T3, T4, T5, T6

## Objetivo

Que lo que un miembro publica lo vean los demás. Es la entrega que da sentido
a toda la sección: hasta aquí, Cartas es un prototipo privado por navegador;
a partir de aquí, es un mercado.

## Por qué no se parte

Ofertas, búsquedas y listas personales salen **en una sola entrega**. Una
versión intermedia «ofertas en D1, búsquedas en local» dejaría dos fuentes de
verdad: el catálogo mostraría ofertas reales mientras las coincidencias
seguirían cruzándolas con búsquedas ficticias. Es la misma fractura que
produjo el falso cero del indicador de Inicio, multiplicada. Se acepta que la
tarea sea grande a cambio de que sea coherente.

## Alcance

- Migración con `marketplace_listing`, `wanted_card` y `personal_card_list`.
- Endpoints de lectura: catálogo de la comunidad (paginado), mis ofertas, mis
  búsquedas, mis listas, y la página compartible de un miembro.
- Endpoints de escritura: publicar, editar, retirar y volver a publicar una
  oferta; añadir, editar, pausar y reactivar una búsqueda; crear y renombrar
  listas; mover una oferta o búsqueda de lista.
- Importación en modo «Añadir» (publicar cada línea como oferta o búsqueda
  nueva). El modo «Sincronizar» queda para T5.
- Cliente, hooks e interfaz conectados con el patrón habitual.

## Fuera de alcance

- Reservas y cierre de operaciones (T4). En esta tarea `reserved` y
  `completed` existen en el esquema pero ningún endpoint los produce.
- Coincidencias (T3). Mientras T3 no llegue, la pestaña «Coincidencias» y el
  indicador de Inicio muestran claramente que están pendientes.
- El modo «Sincronizar» de la importación (T5).
- Búsqueda por texto en el servidor. El catálogo se filtra en el cliente sobre
  la página recibida, como hoy.

## Cambios previstos

### Migración `migrations/NNNN_marketplace.sql`

Las tres tablas siguen las definiciones de
[`../02-plan-backend.md`](../02-plan-backend.md#3-modelo-de-datos). Puntos
que no deben olvidarse:

- `marketplace_listing` y `wanted_card` **denormalizan** `oracle_id` y
  `normalized_name` desde `card` al escribir. Es lo que permite que la consulta
  de emparejamiento (T3) no tenga que unir con `card`.
- `wanted_card.accepted_language` y `accepted_finish` son **columnas**, no
  JSON: el modelo actual garantiza un único valor por línea.
- `status` con `check` explícito en ambas tablas.
- `personal_card_list.kind` con `check ('wanted', 'offers')`.
- Índices:

  ```
  marketplace_listing (community_id, status, language, finish, oracle_id)
  marketplace_listing (member_id, status)
  wanted_card         (member_id, status)
  personal_card_list  (member_id, kind)
  ```

### Worker `worker/marketplace.ts`

Todas las rutas bajo `/api/communities/:id/`. Todas exigen miembro validado;
las de escritura comprueban además que el recurso pertenece a quien escribe.

| Método | Ruta                               | Quién    | Notas                                                             |
| ------ | ---------------------------------- | -------- | ----------------------------------------------------------------- |
| GET    | `listings`                         | validado | catálogo: solo `available`, paginado, orden por fecha             |
| GET    | `members/:memberId/listings`       | validado | página compartible: `available` y `reserved`, sin contactos       |
| GET    | `me/listings`                      | validado | mis ofertas, todos los estados                                    |
| POST   | `listings`                         | validado | publicar; `card_id` debe existir en el catálogo                   |
| PATCH  | `listings/:listingId`              | dueño    | cantidad, idioma, estado, acabado, precio, lista                  |
| PATCH  | `listings/:listingId/status`       | dueño    | solo `available` ↔ `withdrawn`; nunca a `reserved` ni `completed` |
| GET    | `me/wanted-cards`                  | validado |                                                                   |
| POST   | `me/wanted-cards`                  | validado | suma cantidades si la variante exacta ya existe                   |
| PATCH  | `me/wanted-cards/:wantedId`        | dueño    | detalle y lista                                                   |
| PATCH  | `me/wanted-cards/:wantedId/status` | dueño    | `active` ↔ `paused`; `fulfilled` solo desde T4                    |
| GET    | `me/card-lists`                    | validado |                                                                   |
| POST   | `me/card-lists`                    | validado |                                                                   |
| PATCH  | `me/card-lists/:listId`            | dueño    | renombrar                                                         |
| POST   | `listings/batch`                   | validado | importación «Añadir»: hasta 500 ofertas en una llamada            |
| POST   | `me/wanted-cards/batch`            | validado | importación «Añadir» de búsquedas, con los modos `add`/`update`   |

Regla de propiedad en cada escritura: `where id = ? and member_id = ?`, y
`404` si no afecta a ninguna fila. Nunca se devuelve `403` que revele que el
recurso existe.

### Cliente e interfaz

- `src/api/marketplace.ts` + hooks `useCommunityListings`,
  `useMemberMarketplace` (mis ofertas, búsquedas y listas en una carga).
- `CardsPage.tsx` y `SharedCardsPage.tsx` dejan de leer `data.listings`,
  `data.wantedCards` y `data.cardLists` cuando hay cuenta conectada.
- Las funciones locales de `cardMutations.ts`, `cardLifecycle.ts` y
  `cardLists.ts` se conservan para el modo sin cuenta. Su lógica de validación
  (cantidad ≥ 1, precio redondeado a céntimos, lista del tipo correcto) se
  **replica en el worker**; no se confía en el cliente.

### Paginación

El catálogo se pagina en el servidor (`limit`/`cursor` por `created_at, id`).
Hoy la interfaz pagina en memoria sobre la lista completa; pasa a pedir
páginas. La galería y la tabla comparten el mismo hook, para que cambiar de
vista no vuelva a cargar.

## Criterios de aceptación

- [ ] Un miembro publica una oferta desde un navegador y otro miembro la ve en
      el catálogo desde otro navegador.
- [ ] Un miembro **no** puede editar, retirar ni mover la oferta de otro: la
      API responde `404` y la interfaz no ofrece la acción.
- [ ] Retirar una oferta la saca del catálogo y de la página compartible, pero
      sigue en «Mis ofertas» y se puede volver a publicar.
- [ ] Añadir una búsqueda con la misma carta, idioma y acabado que una
      existente suma las cantidades en lugar de crear otra línea.
- [ ] Una importación «Añadir» de 300 líneas crea 300 ofertas en una sola
      llamada y muestra el aviso de duplicados si ya existían.
- [ ] Un catálogo con 2 000 ofertas se recorre por páginas sin cargar la lista
      entera.
- [ ] Sin cuenta conectada, todo sigue funcionando en local exactamente como
      hoy.

## Pruebas exigidas

- `worker/marketplace.test.ts`: propiedad en cada escritura, transiciones de
  estado permitidas y prohibidas, suma de búsquedas idénticas, validación de
  cantidad y precio, `batch` con una línea inválida (¿se rechaza todo o se
  omite la línea? — ver pregunta abierta), paginación con cursor.
- Cliente y hooks según el patrón.
- Integración con el banco de T0: catálogo con feed real, «Mis listas» con
  feed real, y la página compartible de un miembro real.
- Las pruebas existentes de `cardMutations`, `cardLifecycle` y `cardLists`
  se mantienen: siguen protegiendo el modo local.

## Riesgos

- **Tamaño de `CardsPage.tsx`** (cerca de 2 900 líneas). Conectar cada acción
  a un hook engordará el archivo. Conviene aprovechar para extraer las tres
  pestañas a `src/components/cards/`, siguiendo lo que ya se hizo con
  `MarketplaceSection` y `MatchesSection`. No es obligatorio, pero hacerlo
  después será más caro.
- **El campo `offerType`** está obsoleto en el modelo actual. La tabla no lo
  incluye; el cliente deja de enviarlo.

## Preguntas abiertas

- ❓ **`batch` con líneas inválidas**: ¿todo o nada, o se aplican las válidas
  y se devuelven las rechazadas? Propuesta: aplicar las válidas y devolver la
  lista de rechazadas con motivo, que es lo que la vista previa de importación
  ya sabe mostrar.
- ❓ **Límite de 500 por `batch`**: ¿suficiente? Un vendedor con 1 000
  cartas haría dos llamadas. Propuesta: mantener 500 y trocear en el cliente.
- ❓ **`notes` en `wanted_card`**: el modelo local tiene `notes?` pero la
  interfaz no lo expone. ¿Se migra la columna o se elimina del modelo?
  Propuesta: eliminarla del modelo; añadirla después si aparece la necesidad.
- ❓ **Página compartible sin sesión**: hoy exige miembro validado. ¿Debe
  seguir así? Si se abriera a cualquiera con el enlace, la ruta cambiaría de
  autorización y no debería exponer nada más que carta, cantidad, idioma,
  estado, acabado y precio.
