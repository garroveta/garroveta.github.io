# Cartas — documentación

Cartas es el mercado de cartas de la comunidad: cada miembro publica lo que
ofrece, registra lo que busca, y la aplicación cruza ambas listas para avisar
de las coincidencias. Solo Magic: The Gathering, solo venta, sin pagos dentro
de la aplicación.

Es la única sección que **todavía no está conectada a D1**: funciona entera
sobre datos de demostración guardados en el navegador. Esta carpeta reúne lo
que hace hoy, cómo debería conectarse, y el trabajo pendiente desglosado para
que otra persona pueda revisarlo y ejecutarlo.

## Cómo leer esta carpeta

| Documento                                      | Para qué sirve                                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`01-estado-actual.md`](./01-estado-actual.md) | Lo que la sección hace **hoy**: modelo de datos, flujos, reglas del emparejamiento, límites conocidos. Leerlo primero.       |
| [`02-plan-backend.md`](./02-plan-backend.md)   | El **diseño** de la migración a D1: tablas, la consulta de emparejamiento, ciclo de vida del estado, rendimiento, riesgos.   |
| [`tareas/`](./tareas/README.md)                | El **trabajo**, tarea por tarea: alcance, cambios previstos, criterios de aceptación, pruebas exigidas y preguntas abiertas. |

Los dos primeros son de referencia y cambian poco. La carpeta `tareas/` es la
que se revisa y se discute.

## Cómo revisar

- Cada tarea es un archivo. Comentar sobre la línea concreta del archivo que se
  cuestiona, no sobre el conjunto.
- Las preguntas que el redactor no ha podido cerrar están marcadas con **❓**
  dentro de cada tarea. Son el primer sitio donde mirar.
- Un criterio de aceptación que parezca insuficiente o imposible de comprobar
  es un comentario tan útil como un error de diseño.
- Las convenciones del proyecto (idioma, validación antes de cada commit,
  patrón migración → worker → api → hook → interfaz) están en
  [`AGENTS.md`](../../AGENTS.md) y no se repiten aquí.

## Estado

| Fecha      | Situación                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-09-06 | Documentación inicial de la funcionalidad local.                                                           |
| 2026-09-08 | Plan de migración a D1. Datos de contacto en D1 (`0011`), pensados entonces como primera etapa del plan.   |
| 2026-09-12 | Los contactos pasan a ser visibles por todos los miembros validados en la ficha: salen del plan de Cartas. |
| 2026-09-15 | Documentación reunida en esta carpeta y trabajo desglosado en tareas T0–T6.                                |
