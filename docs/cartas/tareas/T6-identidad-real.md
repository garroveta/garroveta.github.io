# T6 · Identidad real y retirada del prototipo

Tamaño: S · Depende de: T2, T3 · No bloquea nada

## Objetivo

Que Cartas deje de saber quién eres por el **miembro ficticio del prototipo**
(`demoData.currentMemberId = 'member-alex'`) y pase a saberlo por la cuenta
conectada (`community_member.id`). Y, con ello, retirar los apaños que ese
desdoblamiento obligó a mantener.

## Por qué existe el desdoblamiento

Toda la aplicación conectada se apoya en `connectedMember`, construido en
`src/App.tsx` a partir de la adhesión aprobada… **pero conservando el `id` del
miembro de demostración**. Fue necesario porque las ofertas, búsquedas y
coincidencias locales están escritas con `member-alex`, `member-diego`, etc.;
sin ese `id` ficticio, nada de Cartas sería «tuyo».

Cuando T2 y T3 hayan puesto esos datos en D1 con el `member_id` real, el
apaño deja de tener razón de ser y pasa a ser un riesgo: dos identidades para
la misma persona.

## Alcance

- `connectedMember.id` pasa a ser el `id` de la adhesión aprobada.
- Retirada del prop `cardsData` de `HomePage` y del selector
  `getMemberNewCardMatches` leyendo del prototipo: el indicador usa el
  recuento de T3.
- Retirada del aviso «Datos de demostración» del detalle de coincidencia
  (`CardsPage.tsx`, clase `contact-demo-notice`): con T2 los vendedores son
  miembros reales y sus contactos, los de su ficha.
- `SharedCardsPage` y `CardsPage` reciben el miembro real donde hoy reciben
  `currentMember.id`.
- Revisión de cada `data.currentMemberId` restante en `src/App.tsx` (hoy hay
  usos en inscripciones a eventos) para confirmar que ninguno corresponde a
  Cartas.

## Fuera de alcance

- Eliminar `demoData` o el modo sin cuenta. El prototipo local sigue siendo
  el modo de desarrollo y de demostración; solo deja de ser la identidad de
  una cuenta real.
- Cualquier cambio en cómo se autentica la persona.

## Cambios previstos

| Archivo                           | Cambio                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                     | `connectedMember` toma `id: approvedMembership.id`; el prop `cardsData` desaparece.                                                             |
| `src/pages/HomePage.tsx`          | Sin `cardsData`; el indicador lee del hook de recuento de T3.                                                                                   |
| `src/data/dashboardSelectors.ts`  | `getMemberNewCardMatches` se elimina o se reduce al modo sin cuenta.                                                                            |
| `src/pages/CardsPage.tsx`         | Se retira el aviso de demostración y su explicación; queda `ContactMethodList` y «Los mismos datos que muestra su ficha de miembro.»            |
| `src/styles.css`                  | Se retira `.contact-demo-notice`.                                                                                                               |
| `docs/cartas/01-estado-actual.md` | Se retiran las filas «Identidad local», «Tarjeta de Inicio» y «Vendedores ficticios» de los límites conocidos, y la salvedad de la sección 5.9. |

## Criterios de aceptación

- [ ] Con una cuenta real conectada, «Mis ofertas» muestra solo lo publicado
      por esa cuenta, y ninguna oferta del prototipo aparece como propia.
- [ ] Reservar una oferta y volver a entrar desde otro navegador con la misma
      cuenta muestra la reserva como propia.
- [ ] El indicador de Inicio y la pestaña «Coincidencias» muestran el mismo
      número con la cuenta real (misma comprobación que en T3, ahora sin
      `cardsData`).
- [ ] El detalle de una coincidencia muestra los contactos reales del
      vendedor, sin aviso de demostración.
- [ ] `grep cardsData src/` no devuelve nada. `grep contact-demo-notice src/`
      tampoco.
- [ ] Sin cuenta conectada, el prototipo sigue funcionando con `member-alex`.

## Pruebas exigidas

- Las pruebas de integración que hoy usan `demoData.currentMemberId` como
  identidad de una cuenta conectada se reescriben con el `id` de la adhesión
  (`buildCurrentUser` en `src/App.test.tsx`). Es la parte laboriosa de la
  tarea, no el código.
- La prueba del indicador de Inicio de T0 se mantiene y debe seguir
  distinguiendo el fallo, ahora leyendo del servidor.

## Preguntas abiertas

- ❓ **Momento.** Puede hacerse justo después de T3, sin esperar a T4 y T5.
  Cuanto antes se elimine la doble identidad, menos código nuevo se escribe
  contra ella. Propuesta: inmediatamente después de T3.
- ❓ **Migración de datos existentes.** Si algún miembro real ya ha usado
  Cartas en local, sus datos se pierden al pasar a D1: estaban en su
  navegador. ¿Se avisa en la interfaz al conectar T2, o se asume que el
  prototipo nunca tuvo datos reales? Propuesta: un aviso único en la sección
  cuando se detecten datos locales de Cartas al arrancar con T2, con un botón
  para descartarlos.
