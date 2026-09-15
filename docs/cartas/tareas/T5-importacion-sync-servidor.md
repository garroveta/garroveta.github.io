# T5 · Importación y sincronización en el servidor

Tamaño: M · Depende de: T2, T4 · No bloquea nada

## Objetivo

Que el modo «Sincronizar» de la importación —el que ajusta una lista privada
al archivo del vendedor y retira lo que ya no está— funcione contra las
ofertas reales y **no pueda usarse para modificar lo que no se debe**.

## Lo que ya existe y se reutiliza

`src/data/cardSync.ts` es un módulo puro, sin dependencia de React ni del
navegador, con tres funciones:

| Función                          | Papel                                                                     |
| -------------------------------- | ------------------------------------------------------------------------- |
| `computeMarketplaceSyncPlan`     | describe lo que cambiaría, sin cambiar nada                               |
| `resolveMarketplaceSyncConflict` | convierte un conflicto resuelto por la persona en entradas normales       |
| `applyMarketplaceSyncPlan`       | aplica un plan **sin conflictos**, releyendo cada oferta antes de tocarla |

Y `findMarketplaceImportOverlap`, que alimenta el aviso «N de estas cartas ya
están en tus ofertas» del modo «Añadir».

El módulo se diseñó para poder trasladarse: la tarea consiste en moverlo al
Worker y en cambiar **una** cosa de naturaleza.

## El cambio de naturaleza

Hoy el plan se calcula en el cliente, la persona lo edita (resuelve conflictos,
cambia cantidades) y se aplica en el cliente. En el servidor, **el plan vuelve
del cliente y por tanto es manipulable**: nada impide enviar un plan que
«actualice» ofertas de otro miembro o «retire» cartas que no estaban en el
archivo.

La función `claim()` de `applyMarketplaceSyncPlan` ya relee cada oferta antes
de modificarla y descarta las que cambiaron de estado. En el servidor esa
relectura pasa de comodidad a **garantía de seguridad**, y debe ampliarse:

- cada oferta del plan debe pertenecer al miembro que llama **y** a la lista
  del ámbito (`scope.cardListId`);
- ninguna operación del plan puede tocar una oferta `reserved` ni
  `completed`, pase lo que pase en el plan recibido;
- una oferta que el plan quiere retirar debe existir y estar `available`.

Todo lo que no cumpla se **omite y se devuelve en `skipped`**, no se rechaza
la llamada entera: es el comportamiento que la interfaz ya sabe mostrar
(«N sin tocar porque cambiaron mientras tanto»).

## Alcance

- Traslado de `cardSync.ts` a `worker/card-sync.ts`, con las mismas pruebas
  (20 hoy) adaptadas a D1.
- Dos endpoints: calcular el plan, aplicar el plan.
- El aviso de duplicados del modo «Añadir» pasa a un endpoint de recuento.
- `MarketplaceSyncPreview` no cambia: recibe el mismo `MarketplaceSyncPlan`.

## Fuera de alcance

- Resolver conflictos en el servidor. `resolveMarketplaceSyncConflict` se
  queda **en el cliente**: transforma el plan antes de enviarlo, y el servidor
  revalida el resultado igual que cualquier otro plan.
- El análisis de archivos (`cardListImport.ts`) y la resolución contra
  Scryfall siguen en el cliente.
- Anular una importación (ver `README.md`, «Lo que se queda fuera»).

## Cambios previstos

### Worker `worker/card-sync.ts`

| Método | Ruta                   | Cuerpo                                                      | Respuesta                  |
| ------ | ---------------------- | ----------------------------------------------------------- | -------------------------- |
| POST   | `me/card-sync/plan`    | `scope` + líneas resueltas (`MarketplaceImportItemInput[]`) | `MarketplaceSyncPlan`      |
| POST   | `me/card-sync/apply`   | `scope` + `MarketplaceSyncPlan` sin conflictos              | `MarketplaceSyncResult`    |
| POST   | `me/card-sync/overlap` | líneas resueltas                                            | `MarketplaceImportOverlap` |

`apply` responde `400` si el plan trae conflictos: la regla «no se aplica
nada mientras queden conflictos» deja de depender de que la interfaz
deshabilite un botón.

Las líneas resueltas llegan con el `cardId` del catálogo compartido (T1); el
servidor no vuelve a resolver nada.

### Datos locales

`src/data/cardSync.ts` se conserva para el modo sin cuenta, o se convierte en
una fina capa que importe los tipos del worker. Preferible lo segundo, para
no tener dos copias de las reglas; ver pregunta abierta.

## Criterios de aceptación

- [ ] Un plan que incluya una oferta de **otro** miembro: la oferta aparece
      en `skipped`, nada más cambia, y la respuesta es `200`.
- [ ] Un plan que incluya una oferta de otra **lista** del mismo miembro:
      igual, `skipped`.
- [ ] Un plan que pida retirar una oferta `reserved`: `skipped`.
- [ ] Un plan con conflictos sin resolver: `400`, sin escritura.
- [ ] Un plan calculado, seguido de una reserva por otro miembro, seguido de
      `apply`: la oferta reservada queda en `skipped` y el resto se aplica.
- [ ] Reimportar el mismo archivo dos veces: la segunda vez el plan es todo
      `unchanged` y `apply` no escribe nada.
- [ ] Las 20 pruebas actuales de `cardSync.test.ts` tienen su equivalente
      contra D1.

## Pruebas exigidas

- `worker/card-sync.test.ts`: los casos de arriba, más los 20 existentes
  portados. Los de manipulación (oferta ajena, otra lista, reservada) son
  los que justifican la tarea: sin ellos, no se ha demostrado nada.
- Integración con el banco de T0: el parcours completo desde la vista previa
  hasta el mensaje «Sincronización aplicada».

## Riesgos

- **Tamaño del cuerpo.** Un plan para 1 000 ofertas es grande, y el Worker
  tiene límites de tamaño de petición. `readJsonBody` ya recibe un máximo por
  ruta; hay que fijarlo con margen (¿2 MB?) y medir un plan real.
- **Duplicar reglas.** Si `cardSync.ts` se mantiene en el cliente como copia,
  las reglas divergirán con el tiempo. Ver pregunta abierta.

## Preguntas abiertas

- ❓ **Una sola copia de las reglas.** ¿Puede `src/data/cardSync.ts` importar
  el módulo del worker (código puro, sin `env`) para que exista una única
  implementación usada en local y en servidor? El worker ya importa desde
  `src/domain/`; el sentido inverso aún no se ha hecho. Propuesta: sí, mover
  la lógica pura a `src/domain/cardSync.ts` y que ambos la importen.
- ❓ **`overlap` como endpoint aparte, o dentro de `plan`.** Son dos momentos
  distintos en la interfaz (uno en modo «Añadir», otro en «Sincronizar»).
  Propuesta: aparte, es un recuento barato.
