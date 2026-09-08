# Cartas — plan de migración a D1

Estado: etapa 1 terminada, etapas 2 a 6 pendientes
Fecha: 8 de septiembre de 2026

Este documento describe cómo conectar la sección **Cartas** a la base de datos
D1. Sustituye y desarrolla la sección 9 de [`cartas.md`](./cartas.md), que
describe la funcionalidad tal y como funciona hoy, en local.

---

## 1. Punto de partida

Cartas es la única sección que no está conectada a D1: toda ella funciona sobre
los datos de demostración guardados en el navegador de cada persona. Lo que
publica un miembro no lo ve nadie más.

El resto de la aplicación ya sigue un patrón establecido, y Cartas debe
adoptarlo sin inventar nada:

| Capa     | Convención                                                              |
| -------- | ----------------------------------------------------------------------- |
| Esquema  | `migrations/NNNN_<tema>.sql`                                            |
| Servidor | `worker/<tema>.ts` con `matchXRoute` y `handleXApiRequest`, más su test |
| Permisos | `authorizeApprovedMember` / `authorizeApprovedManager`                  |
| Cliente  | `src/api/<tema>.ts` y `src/hooks/use<Tema>.ts`, cada uno con su test    |

---

## 2. Decisión central: el emparejamiento es una consulta

Hoy una coincidencia es **una fila almacenada**, y `synchronizeCardMatches`
recalcula todas las coincidencias de todo el conjunto de datos en cada
mutación. Ese diseño no puede trasladarse al servidor: obligaría a recorrer los
datos de toda la comunidad cada vez que alguien publica o reserva una carta.

En su lugar: **la pareja es una consulta, y solo el estado se almacena.**

Consecuencia directa: publicar, importar, retirar o editar una oferta **no
escribe nada** en las coincidencias. No hay recálculo. Las únicas escrituras
son las transiciones de estado, provocadas por una acción explícita sobre una
coincidencia concreta.

Las seis reglas del emparejamiento (sección 6 de `cartas.md`) son todas
expresables en SQL gracias a dos hechos del modelo actual:

- `acceptedLanguages` y `acceptedFinishes` contienen **exactamente un
  elemento**, así que pasan a ser dos columnas y no JSON;
- el respaldo por nombre necesita una columna `normalized_name` en `card`,
  calculada al insertar, en lugar de normalizar dentro del bucle como hace hoy
  `cardsMatch`.

Conviene recordar que `WantedCard` lleva su propio `oracle_id`, distinto del de
la carta. La consulta debe reproducir esa particularidad con fidelidad.

---

## 3. Modelo de datos

Cinco tablas nuevas, más dos columnas denormalizadas por rendimiento.

### `card`

Catálogo compartido por toda la comunidad, en lugar de crecer por navegador.
Se alimenta de las importaciones con `insert … on conflict do nothing` sobre
`scryfall_id`. Guarda `normalized_name` y `oracle_id`.

### `marketplace_listing`

Una oferta. Estados `available`, `reserved`, `completed`, `withdrawn`.
Denormaliza `oracle_id` y `normalized_name` desde su carta (ver sección 6).

### `wanted_card`

Una búsqueda, es decir **una variante precisa**: `accepted_language` y
`accepted_finish` como columnas, más `match_all_printings`, `oracle_id` y
`requested_scryfall_id`.

### `personal_card_list`

Carpetas privadas de tipo `wanted` u `offers`. Solo las ve su propietario.

### `card_match` — solo el estado

```sql
create table "card_match" (
  "id" text not null primary key,
  "community_id" text not null references "community"("id") on delete cascade,
  "wanted_card_id" text not null references "wanted_card"("id") on delete cascade,
  "listing_id" text not null references "marketplace_listing"("id") on delete cascade,
  "buyer_member_id" text not null references "community_member"("id") on delete cascade,
  "seller_member_id" text not null references "community_member"("id") on delete cascade,
  "status" text not null check ("status" in ('seen', 'contacted', 'completed')),
  unique ("wanted_card_id", "listing_id")
);
```

`'new'` **no aparece en la restricción**, y ese es el fundamento del modelo:
_ausencia de fila = coincidencia nueva_. Una pareja que pasa a ser compatible es
nueva sin escribir nada; una que deja de serlo desaparece sin limpiar nada.

`buyer_member_id` y `seller_member_id` están denormalizados para que el
historial pueda leerse sin depender de las uniones (ver sección 5).

### `card_deal`

Registro histórico de un intercambio realizado. **Debe denormalizar** el nombre
de la carta y los nombres de los miembros, con referencias en
`on delete set null`: borrar una oferta no puede destruir el registro de un
intercambio que ocurrió de verdad.

---

## 4. La consulta de emparejamiento

```sql
select w.id as wanted_card_id, l.id as listing_id,
       w.member_id as buyer_member_id, l.member_id as seller_member_id,
       coalesce(m.status, 'new') as status
from wanted_card w
join marketplace_listing l
  on  l.community_id = w.community_id
  and l.member_id   <> w.member_id                    -- regla 3
  and (  l.status = 'available'                       -- regla 2
      or (l.status = 'reserved' and l.reserved_by_member_id = w.member_id))
  and l.language = w.accepted_language                -- regla 5
  and l.finish   = w.accepted_finish                  -- regla 6
left join card_match m
  on m.wanted_card_id = w.id and m.listing_id = l.id
where w.member_id = ?1
  and w.status = 'active'                             -- regla 1
  and (                                               -- regla 4
        (w.match_all_printings = 0 and l.card_id = w.card_id)
     or (w.match_all_printings = 1 and case
            when w.oracle_id is not null and l.oracle_id is not null
              then w.oracle_id = l.oracle_id
            else w.normalized_name = l.normalized_name
         end)
      )
```

El `where w.member_id = ?1` es esencial: nunca se calculan las coincidencias de
toda la comunidad, solo las de quien consulta.

El indicador de la pantalla de Inicio es la misma consulta con `count(*)` y
`where m.id is null`.

---

## 5. Ciclo de vida del estado

| Acción                                          | Escritura                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Publicar, importar, retirar o editar una oferta | **ninguna**                                                                                         |
| Abrir el detalle de una coincidencia            | `insert … status='seen' on conflict do nothing`                                                     |
| Revelar el contacto                             | `update … set status='contacted'`                                                                   |
| Cerrar una operación                            | transacción: oferta→`completed`, búsqueda→`fulfilled`, coincidencia→`completed`, insert `card_deal` |

El `on conflict do nothing` al pasar a `seen` evita degradar una coincidencia
que ya estaba en `contacted`.

### Las operaciones cerradas

Una coincidencia `completed` debe conservarse siempre. Pero al cerrarse la
operación la oferta pasa a `completed` y deja de cumplir la regla 2: la consulta
de emparejamiento ya no la encuentra.

Por eso la lectura reúne **dos fuentes**: la consulta viva, en unión con las
filas `card_match` en `completed` del miembro, que se leen directamente gracias
a los identificadores denormalizados.

### Un cambio de comportamiento asumido

Hoy, si una pareja deja de ser compatible y vuelve a serlo, el estado se
**pierde** y la coincidencia reaparece como nueva. Con una tabla de estado
persistente, la fila `seen` sobrevive y el estado **vuelve**.

Es preferible —el miembro sí había visto esa oferta— pero es una diferencia
real. También deja filas de estado para parejas inactivas: se toleran a
propósito, porque son exactamente lo que permite ese comportamiento.

---

## 6. Rendimiento

Índices necesarios:

```
wanted_card         (member_id, status)
marketplace_listing (community_id, status, language, finish, card_id)
card                (oracle_id), (normalized_name)
card_match          unique (wanted_card_id, listing_id)
```

El camino costoso es `match_all_printings = 1`, que no puede apoyarse en la
igualdad de `card_id`. Y no es un caso raro: la interfaz marca «Aceptar
cualquier edición» **por defecto** y la recomienda.

Por eso `marketplace_listing` y `wanted_card` denormalizan `oracle_id` y
`normalized_name`: las uniones con `card` desaparecen de la consulta, la regla 4
pasa a ser una comparación de columnas y el índice útil es
`(community_id, status, language, finish, oracle_id)`. El precio es propagar
esos dos campos cuando una importación enriquece una carta que aún no tenía
`oracle_id`.

Volumen esperado: 20 vendedores × 1 000 ofertas = 20 000 filas. Nada
preocupante para D1. El único punto de atención es la paginación del catálogo,
hoy hecha en memoria sobre la lista completa en el navegador.

---

## 7. Reglas que cambian de naturaleza

Dos cosas que hoy son convenciones de interfaz se convierten en reglas del
servidor:

**Los datos de contacto.** Hoy la interfaz decide mostrarlos solo en el detalle
de una coincidencia. Eso no es una frontera de seguridad: el endpoint que los
devuelve debe **comprobar él mismo** que existe una coincidencia entre los dos
miembros. De lo contrario cualquiera consulta la API y recupera los contactos de
toda la comunidad.

**Las reservas.** Dos miembros pueden reservar el último ejemplar a la vez. Hace
falta un update condicional (`where quantity - reserved >= ?`) comprobando
`changes()`, nunca un leer-modificar-escribir.

---

## 8. Secuencia de trabajo

| #   | Etapa                          | Contenido                                             | Qué entrega                                   |
| --- | ------------------------------ | ----------------------------------------------------- | --------------------------------------------- |
| 1   | **Datos de contacto** ✅       | migración `0011`, edición desde el perfil             | cada miembro guarda de verdad sus contactos   |
| 2   | **Catálogo compartido**        | tabla `card`, alimentada por las importaciones        | el catálogo deja de ser por navegador         |
| 3   | **Ofertas, búsquedas, listas** | propiedad, paginación en servidor, página compartible | **la comunidad ve por fin las mismas cartas** |
| 4   | **Coincidencias**              | la consulta de la sección 4 más la tabla de estado    | los avisos pasan a ser reales                 |
| 5   | **Reservas y operaciones**     | updates condicionales, concurrencia                   | las reservas aguantan entre varias personas   |
| 6   | **Importación y sync**         | plan calculado y aplicado en el servidor              | la sincronización pasa a ser segura           |

La etapa 1 es deliberadamente pequeña: valida toda la cadena migración →
worker → api → hook → interfaz sobre un tema de bajo riesgo, antes de abordar la
etapa 3.

**Lo que la etapa 1 no hace.** La lectura protegida descrita en la sección 7
depende de que las coincidencias existan en el servidor, que es la etapa 4. Por
eso la etapa 1 se limita al **autoservicio**: cada miembro guarda y consulta sus
propios datos, y nadie lee los de otro. Los contactos que aparecen hoy en el
detalle de una coincidencia siguen siendo de demostración, y la pantalla lo
sigue advirtiendo, hasta que la etapa 4 permita comprobarla en el servidor.

**La etapa 3 no debe partirse.** Entregar «las ofertas en D1 pero las búsquedas
en local» crearía justo el tipo de fractura que produjo el falso cero del
indicador de Inicio: dos fuentes de verdad que se contradicen en silencio.

---

## 9. Lo que no migra

El **análisis de los archivos se queda en el cliente**: el archivo está en la
máquina de la persona y no hay razón para enviarlo. `cardListImport.ts` no se
mueve.

En cambio `cardSync.ts` sí pasa al Worker en la etapa 6, con una consecuencia
que conviene tener presente: **el plan vuelve del cliente, así que es
manipulable**. El servidor debe revalidar cada operación contra las ofertas
reales del miembro. La función `claim()` de `applyMarketplaceSyncPlan`, que
relee cada oferta y descarta aquellas cuyo estado ha cambiado, ya tiene la forma
correcta, pero pasa a ser una **garantía de seguridad** y no una comodidad.

---

## 10. Riesgos conocidos

**Las reglas salen de TypeScript y entran en SQL.** Las pruebas unitarias de
`cardMatching.test.ts` dejarán de protegerlas: estarán probando código muerto.
Antes de cambiar, las pruebas del worker deben cubrir la consulta contra una D1
local, caso por caso: las seis reglas, el respaldo oracle/nombre, la
visibilidad de una oferta reservada por quien busca, y la conservación de las
`completed`.

**El banco de pruebas actual no cubre esta clase de fallos.** Quedó demostrado
con el falso cero del indicador de Inicio: la prueba de integración pasaba
incluso antes de la corrección, porque los mocks nunca invocan `onLoaded` y la
lista real jamás sustituye a los miembros de demostración. Antes de la etapa 3,
los mocks deben saber simular un feed de miembros real; de lo contrario se
migrará a ciegas.

**La identidad.** Las comprobaciones de propiedad se apoyan hoy en el
identificador ficticio del prototipo. Al conectar Cartas, pasan a apoyarse en
`community_member.id`, y el `cardsData` que hoy recibe la pantalla de Inicio
desaparece.
