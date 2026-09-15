# T0 · Banco de pruebas: simular un feed real de miembros

Tamaño: S · Depende de: nada · Bloquea: T1 y todo lo demás

## Objetivo

Que las pruebas de integración de `src/App.test.tsx` puedan reproducir la
situación real de una cuenta conectada: la lista de miembros de demostración
**sustituida** por la que devuelve el servidor. Hoy no pueden, y eso ya ocultó
un fallo.

## Por qué va primero

El indicador «N coincidencias nuevas» de Inicio mostraba **0** a cualquier
cuenta real, porque `homeData.members` pasaba a ser la lista real de la
comunidad y los vendedores ficticios de las coincidencias dejaban de
encontrarse. La prueba de integración escrita para ese fallo **pasaba antes de
la corrección**: el mock de `useCommunityMembers` devuelve `{ reload, status }`
y nunca invoca `onLoaded`, así que en las pruebas la lista real jamás
reemplaza a la de demostración.

Todas las tareas siguientes sustituyen datos locales por datos del servidor.
Sin este banco, cada una se validaría contra una situación que no es la real.

## Alcance

- Un mock de `useCommunityMembers` que capture las opciones con que se invoca
  (en particular `onLoaded`) y permita, desde una prueba, entregar una lista de
  miembros «real» con `act(() => onLoaded([...]))`.
- El mismo mecanismo para cualquier hook que las tareas T1–T5 vayan a crear
  (`useCommunityCards`, `useMemberListings`… según se nombren), para que no
  haya que reinventarlo tarea a tarea.
- Una prueba que **demuestre** que el banco sirve: reproducir el falso cero de
  Inicio entregando una lista real sin los vendedores de demostración, y
  comprobar que el indicador sigue contando las coincidencias del prototipo.

## Fuera de alcance

- Cambiar el comportamiento de la aplicación. Esta tarea solo toca pruebas.
- Reescribir los mocks de los hooks que no intervienen en Cartas.

## Cambios previstos

| Archivo            | Cambio                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/App.test.tsx` | El mock de `useCommunityMembers` sigue el patrón que **ya existe** para `useCommunityCommunications`: un `invoke: vi.fn()` que registra las opciones, y un test que recupera `onLoaded` desde `invoke.mock.calls`. |
| `src/App.test.tsx` | Un helper reutilizable, del estilo `deliverFeed(hookMocks, items)`, para no repetir el patrón en cada prueba de T1–T5.                                                                                             |
| `src/App.test.tsx` | La prueba «keeps counting card matches once a real membership is connected» pasa a entregar una lista real **sin** `member-diego`, `member-sergio`, `member-hugo`, y debe seguir viendo 4 coincidencias.           |

## Criterios de aceptación

- [ ] Existe una forma documentada (comentario en el helper) de entregar un
      feed real a un hook mockeado desde una prueba de integración.
- [ ] La prueba del indicador de Inicio **falla** si se revierte el commit
      `bc0a47d` (`getMemberNewCardMatches` leyendo de `cardsData`) y pasa con
      él. Comprobarlo revirtiendo localmente antes de dar la tarea por hecha.
- [ ] Ninguna otra prueba cambia de resultado.

## Pruebas exigidas

- La prueba de integración descrita arriba.
- No se exige prueba del helper en sí: su prueba es que la anterior distingue
  el fallo.

## Preguntas abiertas

- ❓ ¿Merece la pena extraer los mocks de hooks de `src/App.test.tsx` a un
  archivo `src/test/hookMocks.ts`? El archivo de pruebas supera las 5 000
  líneas. Es una mejora independiente; si se hace, que sea en un commit aparte.
