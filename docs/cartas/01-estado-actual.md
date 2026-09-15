# Cartas — documentación de la funcionalidad

Estado: prototipo local, todavía sin backend
Última actualización: 6 de septiembre de 2026

Este documento reúne todo lo que hace hoy la sección **Cartas** de Garroveta:
su alcance, su modelo de datos, sus reglas de funcionamiento y sus límites
conocidos. Está pensado para actualizarse cada vez que la sección evolucione.

---

## 1. Qué es

Cartas es el espacio de intercambio de la comunidad: cada miembro publica las
cartas que ofrece, registra las que busca, y la aplicación cruza ambas listas
automáticamente para avisar cuando hay una coincidencia.

Alcance actual:

- **Solo Magic: The Gathering.** Ningún otro juego de la comunidad participa.
- **Solo venta.** El modelo conserva un campo histórico `offerType`, pero está
  obsoleto: todas las ofertas se tratan como venta.
- **Sin pagos ni comisiones.** La aplicación pone en contacto a las dos
  personas; el intercambio y el pago se organizan libremente entre ellas.
- **Los precios son orientativos.** Si no se indica ninguno, se muestra
  «A convenir».

---

## 2. Estado actual: todo funciona en local

Es el punto más importante de este documento.

A diferencia del resto de la aplicación (eventos, inscripciones, noticias,
clasificación, miembros), **Cartas no está conectada a la base de datos D1**.
Toda la sección funciona sobre los datos de demostración guardados en el
navegador de cada persona.

Consecuencias concretas:

- Lo que publica un miembro **no lo ve nadie más**: cada navegador tiene su
  propia copia.
- Nada se conserva entre dispositivos ni sobrevive al borrado de los datos del
  navegador.
- Las coincidencias, los vendedores y los datos de contacto que se muestran hoy
  provienen del juego de datos ficticio, no de personas reales.
- El indicador «X coincidencias nuevas» de la pantalla de Inicio también es
  ficticio mientras la sección siga sin conectarse.

Toda la lógica descrita más abajo ya está escrita, probada y funcionando; lo
que falta es la capa de persistencia compartida.

---

## 3. Modelo de datos

Seis entidades, definidas en `src/domain/types.ts`.

### `Card` — la carta en sí

Catálogo de impresiones conocidas: nombre, edición (`setName`, `setCode`),
número de coleccionista, y opcionalmente `scryfallId`, `oracleId` e imagen.
El catálogo crece solo: cada importación añade las impresiones que aún no
existían.

### `MarketplaceListing` — una oferta

| Campo                                                  | Contenido                                             |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `memberId`                                             | miembro que ofrece la carta                           |
| `cardId`                                               | impresión concreta ofrecida                           |
| `cardListId`                                           | lista personal a la que pertenece (opcional, privada) |
| `quantity`                                             | unidades disponibles                                  |
| `language`                                             | `es`, `en`, `fr`, `de`, `it`, `pt`, `jp`, `other`     |
| `condition`                                            | los siete grados de Cardmarket, de `mint` a `poor`    |
| `finish`                                               | `nonfoil` o `foil`                                    |
| `priceEur`                                             | opcional                                              |
| `status`                                               | `available`, `reserved`, `completed`, `withdrawn`     |
| `reservedByMemberId`, `reservedQuantity`, `reservedAt` | reserva en curso                                      |

### `WantedCard` — una búsqueda

Cada línea representa **una variante precisa**: una sola lengua aceptada y un
solo acabado aceptado (`acceptedLanguages` y `acceptedFinishes` contienen
exactamente un elemento). Buscar la misma carta en dos lenguas son dos líneas.

Campos propios:

- `matchAllPrintings`: si es cierto, acepta cualquier impresión de la carta
  (mismo `oracleId`, o mismo nombre normalizado); si es falso, solo la
  impresión exacta pedida (`requestedScryfallId`).
- `importSection`: sección de origen si vino de una importación
  (`main`, `sideboard`, `maybeboard`, `commander`, `companion`).
- `status`: `active`, `paused`, `fulfilled`.

### `PersonalCardList` — organización privada

Carpetas para ordenar las propias cartas, de tipo `wanted` u `offers`
(por ejemplo «Pauper» o «Carpeta de venta»). Solo las ve su propietario y no
influyen en las coincidencias.

### `CardMatch` — una coincidencia

Cruce entre una búsqueda y una oferta: `wantedCardId`, `listingId`,
`buyerMemberId`, `sellerMemberId`, `score`, `reason` y `status`
(`new`, `seen`, `contacted`, `completed`).

### `CardDeal` — una operación cerrada

Registro histórico creado cuando el comprador confirma que el intercambio se
ha realizado.

---

## 4. Vistas de la interfaz

La pantalla principal (`src/pages/CardsPage.tsx`) tiene tres pestañas:

1. **Coincidencias** — lo que otros ofrecen y tú buscas. Se puede agrupar por
   carta o por miembro. Al abrir una coincidencia se marca como «Vista».
2. **Ofertas** — catálogo de todo lo disponible en la comunidad, con buscador,
   opción de ocultar las propias ofertas, vista en tabla (20 por página) o en
   galería de imágenes (2 o 4 columnas, 12 o 20 por página).
3. **Mis listas** — con tres subvistas: **Buscadas**, **Mis ofertas** y
   **Reservadas**, cada una con su buscador y sus listas personales.

Dos acciones permanentes en la cabecera: **Añadir carta** y **Importar lista**.

Además existe una **página compartible por miembro**
(`src/pages/SharedCardsPage.tsx`, ruta `#cartas?member=ID`): un catálogo
público de las ofertas de esa persona, filtrable por edición, lengua y estado,
con un enlace que conserva los filtros aplicados. Esta página **no muestra
datos de contacto**.

---

## 5. Flujos principales

### 5.1 Publicar una carta

Desde «Añadir carta» se elige el destino (oferta o búsqueda), la carta, la
cantidad, la lengua, el estado, el acabado y, para una oferta, el precio.
Solo un miembro aprobado puede publicar. Al añadir una búsqueda que ya existe
con la misma variante, las cantidades se suman en lugar de duplicar la línea.

### 5.2 Importar una lista

El importador acepta dos formatos, detectados automáticamente:

- **Cualquier CSV de cartas**, no solo el de una herramienta concreta.
  Cardmarket no exporta el stock, así que cada persona llega con el archivo de
  la herramienta que use; el importador se adapta en lugar de imponer un
  formato:
  - separador `,`, `;` o tabulador, elegido automáticamente;
  - cabeceras reconocidas por **alias** en varios idiomas (`Nombre`/`Name`,
    `Cantidad`/`Quantity`/`Amount`, `Idioma`/`Language`, `Estado`/`Condition`,
    `Foil`, `Precio`/`Price`…);
  - valores tolerantes: `NM` o `Near Mint`, `Ingles` o `English`, `X`/`Yes`
    para foil, y precios `1,50`, `1.50` o `1,50 €`;
  - las columnas que no se reconocen se listan en pantalla, para que nadie
    crea que se han importado, y **cada columna se puede reasignar a mano**
    desde «Columnas del archivo»; una elección manual quita el campo a la
    columna que lo tuviera;
  - si ninguna columna contiene el nombre de la carta, el importador lo dice y
    abre el selector de columnas en lugar de fallar en silencio;
  - una columna de edición solo se usa si contiene un **código** (`CMM`); un
    nombre de edición no sirve para resolver la carta y se ignora.

  Un CSV de ManaBox se sigue reconociendo como tal por sus cabeceras
  (`name`, `quantity`, `scryfall id`).

- **Texto libre**, con varias sintaxis de cantidad (`2x Carta`, `2 Carta`,
  `Carta x2`), impresión concreta (`Carta (SET) 123`), comentarios (`//`, `#`)
  y encabezados de sección (`Sideboard`, `Commander`, `Maybeboard`…).

Se toma por CSV lo que tiene **varias filas del mismo ancho**, independientemente
de sus cabeceras; en caso contrario se analiza como texto. Las líneas que no se
pueden analizar se muestran antes de importar, agrupadas por motivo.

El CSV de ManaBox aporta además el idioma, el estado y el acabado de cada
carta: se rellenan solos en la vista previa y siguen siendo modificables. Un
idioma que no está en la lista de la comunidad (coreano, ruso, chino…) se
registra como `other` en lugar de caer en el valor por defecto. El
`Purchase price` de ManaBox es el precio pagado por su propietario, no un
precio de venta: nunca se publica como tal.

Después del análisis, cada línea se resuelve **primero contra el catálogo local
y luego contra Scryfall** (ver sección 7). El usuario revisa el resultado,
elige qué secciones incluir, ajusta cantidades y variantes, y decide el
destino: sus búsquedas o sus ofertas.

Para no repetir el mismo ajuste centenares de veces, **«Aplicar a todas las
líneas»** fija de una vez el idioma, el estado, el acabado o el precio. Solo se
aplican los campos elegidos: los que quedan en «Sin cambiar» no tocan nada, de
modo que un ajuste hecho línea a línea no se pierde.

Antes de añadir, el importador comprueba **cuántas de esas cartas ya ofrece la
persona** (misma carta, idioma, estado y acabado) y lo avisa: «2 de estas 3
cartas ya están en tus ofertas. Añadirlas creará duplicados», con un botón para
pasar a sincronizar. La comprobación no se basa en el archivo sino en las
ofertas existentes, así que sigue funcionando aunque el archivo se haya
reexportado o editado. Se recalcula al editar las líneas: cambiar el acabado a
foil hace desaparecer el aviso, porque una copia foil no es un duplicado.

Para las **ofertas** hay dos modos:

| Modo   | Efecto                                                                   |
| ------ | ------------------------------------------------------------------------ |
| `add`  | publica cada línea como una oferta nueva                                 |
| `sync` | ajusta una lista privada al archivo, y retira lo que ya no aparece en él |

La sincronización se describe en la sección 5.3.

Para las búsquedas hay tres modos:

| Modo     | Efecto                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| `add`    | suma las cantidades a lo que ya existía                                          |
| `update` | sustituye las cantidades existentes                                              |
| `sync`   | además, **pausa** las búsquedas anteriores que no aparecen en la lista importada |

Las líneas no reconocidas se listan al final para que la persona las revise.

### 5.3 Sincronizar una lista de ofertas

Pensado para quien mantiene su stock en otra herramienta (ManaBox, Cardmarket)
y vuelve a importarlo cada cierto tiempo.

**La sincronización siempre se limita a una lista privada.** Casi nadie exporta
todo su stock de una vez, así que una sincronización global retiraría todo lo
que el archivo no menciona. Elegir la lista es obligatorio.

El proceso tiene dos tiempos. Primero se calcula un **plan** que no cambia nada
(`computeMarketplaceSyncPlan`) y se muestra por completo:

| Categoría             | Contenido                                                            |
| --------------------- | -------------------------------------------------------------------- |
| Se publican           | líneas del archivo sin oferta correspondiente                        |
| Se actualizan         | cambios de cantidad, de precio, o vuelta a publicación               |
| Se retiran            | ofertas de la lista ausentes del archivo                             |
| Conflictos            | varias ofertas responden a una línea, o el archivo da varios precios |
| No se tocan           | reservadas, ya vendidas, o nombradas por una línea no reconocida     |
| Líneas no reconocidas | lo que Scryfall no ha sabido resolver                                |

Solo después, y **únicamente si no queda ningún conflicto**, se aplica
(`applyMarketplaceSyncPlan`). Reglas que se garantizan en la capa de datos:

- nada se modifica en silencio: el plan se propone y la persona lo valida;
- una oferta reservada o ya vendida nunca se retira;
- una línea que Scryfall no ha reconocido no provoca ninguna retirada;
- un archivo sin precios nunca borra un precio escrito a mano;
- reimportar el mismo archivo no cambia nada;
- una oferta retirada que vuelve a aparecer se vuelve a publicar, no se duplica;
- cada oferta se relee antes de modificarla: si su estado ha cambiado mientras
  tanto, se deja intacta y se avisa.

Los conflictos se resuelven uno a uno —eligiendo qué oferta conservar, con qué
cantidad y a qué precio— o en bloque, con «Conservar la primera y retirar las
demás» o «No tocar ninguna».

### 5.4 Listas personales

Se pueden crear y renombrar carpetas, y mover cualquier oferta o búsqueda de
una a otra. Es organización privada: no cambia nada de cara al resto de la
comunidad ni al motor de coincidencias.

### 5.5 Coincidencias automáticas

No hay que pulsar nada: cada vez que alguien publica, importa, edita, reserva o
libera algo, las coincidencias se recalculan por completo
(`synchronizeCardMatches`). Las reglas están detalladas en la sección 6.

Las coincidencias ya completadas se conservan siempre; las demás se
reconstruyen, manteniendo su estado (`new`, `seen`, `contacted`) cuando la
pareja búsqueda/oferta sigue siendo válida.

### 5.6 Reservas

Desde una oferta, otro miembro puede reservar **una cantidad parcial** (de 1
hasta la cantidad disponible). Condiciones: ser miembro aprobado, que la oferta
esté disponible y no ser su propietario.

La reserva puede cancelarse tanto por quien reservó como por quien ofrece, total
o parcialmente. Si queda cantidad reservada, la oferta sigue en `reserved`; si
se libera todo, vuelve a `available`.

Una oferta reservada deja de aparecer en el catálogo general, pero **sigue
generando coincidencia para la persona que la reservó**.

### 5.7 Retirar una oferta

Desde «Mis ofertas», el propietario puede retirar una carta sin perderla:
pasa a `withdrawn`, desaparece del catálogo, de la página compartible y de las
coincidencias, pero sigue visible en sus propias listas y se vuelve a publicar
con un clic. Es el equivalente de la pausa de las búsquedas.

Una oferta reservada por otro miembro **no se puede retirar**: primero hay que
resolver o cancelar la reserva.

`withdrawn` no debe confundirse con `completed`, que solo se aplica cuando una
operación se ha cerrado de verdad y va acompañado de un `CardDeal`.

### 5.8 Cerrar una operación

Desde el detalle de una coincidencia, el comprador confirma que el intercambio
se ha realizado. En una sola acción: la oferta pasa a `completed`, la búsqueda
a `fulfilled`, la coincidencia a `completed` y se crea un `CardDeal`. Una misma
coincidencia no puede registrarse dos veces.

### 5.9 Datos de contacto

Los datos de contacto del vendedor (WhatsApp, correo, Discord) aparecen
**únicamente en el detalle de una coincidencia**, y la propia pantalla lo
explica: «estos datos solo se muestran porque existe una coincidencia entre
vuestras listas». No aparecen en el catálogo general ni en la página
compartible.

---

## 6. Reglas del motor de coincidencias

Una búsqueda y una oferta coinciden cuando **todas** estas condiciones se
cumplen:

1. La búsqueda está `active`.
2. La oferta está `available`, **o** está reservada precisamente por la persona
   que busca.
3. La oferta no pertenece a la propia persona que busca.
4. Las cartas se corresponden:
   - si la búsqueda pide una impresión exacta (`matchAllPrintings` falso), debe
     ser la misma `Card`;
   - si acepta cualquier impresión, basta con el mismo `oracleId` o, en su
     defecto, el mismo nombre normalizado (sin acentos ni mayúsculas).
5. La lengua de la oferta está entre las aceptadas por la búsqueda.
6. El acabado de la oferta está entre los aceptados por la búsqueda.

Hoy toda coincidencia válida recibe `score: 100` y el motivo «Carta, idioma y
acabado compatibles.». La puntuación existe en el modelo para poder matizarla
más adelante (por ejemplo, según el estado de la carta o el precio).

---

## 7. Integración con Scryfall

Es la única llamada a un servicio externo de toda la aplicación.

- Endpoint: `POST https://api.scryfall.com/cards/collection`, por lotes de 75
  identificadores.
- Orden de resolución de cada línea: `scryfallId` → `edición + número de
coleccionista` → `nombre`.
- Antes de llamar a Scryfall se busca en el catálogo local; solo se consultan
  las líneas que no se han podido resolver, para reducir el tráfico.
- De cada carta se recuperan nombre, edición, número, `oracleId` e imagen.

Para las imágenes existe además un pequeño mapa estático de cartas conocidas
(`src/data/scryfallImages.ts`), usado cuando una carta del juego de datos no
trae imagen propia.

---

## 8. Límites conocidos

| Límite                      | Detalle                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin backend                 | Nada se comparte entre miembros ni entre dispositivos (sección 2).                                                                                                |
| Datos de contacto no reales | No existe columna en la base de datos ni forma de rellenarlos desde el perfil. La pantalla lo advierte explícitamente para que nadie intente contactar con ellos. |
| Identidad local             | Las comprobaciones de propiedad («esta oferta es mía») se apoyan en el identificador ficticio del prototipo, no en la cuenta real conectada.                      |
| Tarjeta de Inicio           | Cuenta las coincidencias reales del juego de datos local, leídas siempre del prototipo aunque haya una cuenta conectada.                                          |
| Sin mensajería              | El contacto ocurre fuera de la aplicación, por los medios que indique el vendedor.                                                                                |
| Sin precios de referencia   | No hay estimación automática de precio de mercado.                                                                                                                |

---

## 9. Qué haría falta para conectarla a D1

El plan de migración completo —modelo de datos, consulta de emparejamiento,
secuencia de trabajo y riesgos— está en
[`02-plan-backend.md`](./02-plan-backend.md).

## 10. Archivos y pruebas

### Lógica de datos (`src/data/`)

| Archivo                                           | Responsabilidad                                         |
| ------------------------------------------------- | ------------------------------------------------------- |
| `cardMatching.ts`                                 | motor de coincidencias                                  |
| `cardLifecycle.ts`                                | reservas, cancelaciones, cambios de estado y de detalle |
| `cardMutations.ts`                                | publicación e importación de ofertas y búsquedas        |
| `cardLists.ts`                                    | listas personales                                       |
| `cardDeals.ts`                                    | cierre de operaciones                                   |
| `cardSelectors.ts`                                | consultas para la interfaz                              |
| `cardListImport.ts`                               | análisis de listas (texto y CSV de ManaBox)             |
| `cardSync.ts`                                     | plan y aplicación de una sincronización de ofertas      |
| `scryfallClient.ts`                               | resolución de cartas contra Scryfall                    |
| `cardPresentation.ts`, `cardMatchPresentation.ts` | etiquetas en español                                    |
| `scryfallImages.ts`                               | imágenes de respaldo                                    |

### Interfaz

`src/pages/CardsPage.tsx`, `src/pages/SharedCardsPage.tsx`,
`src/components/cards/CardListColumnMapper.tsx`,
`src/components/cards/ImportBulkEditor.tsx`,
`src/components/cards/MarketplaceSection.tsx`,
`src/components/cards/MarketplaceSyncPreview.tsx`,
`src/components/cards/MatchesSection.tsx`,
`src/components/MarketplaceCatalog.tsx`,
`MarketplaceListingTable.tsx`, `MarketplaceListingGallery.tsx`,
`MarketplaceListingAction.tsx`, `MarketplaceReservationSheet.tsx`,
`src/hooks/useMarketplaceReservation.ts`.

### Pruebas

- 34 pruebas unitarias sobre la lógica de datos (7 archivos `src/data/card*.test.ts`).
- 11 pruebas de integración en `src/App.test.tsx`: navegación del catálogo,
  reserva parcial, importación de listas, creación automática de coincidencias,
  revelación del contacto, cierre de operación, edición posterior, página
  compartible y liberación parcial por parte del vendedor.

### Datos de demostración

El juego de datos actual contiene 158 cartas, 159 ofertas, 11 búsquedas,
3 listas personales, 9 coincidencias y ninguna operación cerrada, repartidos
entre 40 miembros ficticios.
