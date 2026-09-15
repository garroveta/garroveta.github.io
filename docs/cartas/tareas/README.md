# Cartas — tareas pendientes

Desglose del trabajo para conectar Cartas a D1. Cada tarea es un archivo
independiente con el mismo esquema: objetivo, dependencias, alcance, cambios
previstos, criterios de aceptación, pruebas exigidas y preguntas abiertas.

El diseño en el que se apoyan está en [`../02-plan-backend.md`](../02-plan-backend.md);
lo que la sección hace hoy, en [`../01-estado-actual.md`](../01-estado-actual.md).

## Orden y dependencias

| Tarea                                                                    | Entrega                                           | Depende de | Tamaño |
| ------------------------------------------------------------------------ | ------------------------------------------------- | ---------- | ------ |
| [T0 · Banco de pruebas](./T0-banco-de-pruebas.md)                        | Mocks capaces de simular un feed de miembros real | —          | S      |
| [T1 · Catálogo compartido](./T1-catalogo-compartido.md)                  | Tabla `card` común a la comunidad                 | T0         | S      |
| [T2 · Ofertas, búsquedas y listas](./T2-ofertas-busquedas-listas.md)     | La comunidad ve por fin las mismas cartas         | T0, T1     | L      |
| [T3 · Coincidencias](./T3-coincidencias.md)                              | Avisos reales, calculados por consulta            | T2         | M      |
| [T4 · Reservas y operaciones](./T4-reservas-operaciones.md)              | Reservas que aguantan la concurrencia             | T2, T3     | M      |
| [T5 · Importación y sync en servidor](./T5-importacion-sync-servidor.md) | Sincronización segura frente a un plan manipulado | T2, T4     | M      |
| [T6 · Identidad real](./T6-identidad-real.md)                            | Adiós al miembro ficticio del prototipo           | T2, T3     | S      |

Tamaños: S = una sesión de trabajo, M = varias, L = un bloque que no debe
partirse.

```
T0 ─► T1 ─► T2 ─┬─► T3 ─┬─► T4 ─► T5
                │       │
                │       └─► T6
                └────────────┘
```

## Dos reglas de secuencia

**T2 no se parte.** Ofertas, búsquedas y listas personales salen juntas. Una
entrega intermedia con las ofertas en D1 y las búsquedas en local produciría
dos fuentes de verdad que se contradicen en silencio, que es exactamente el
fallo que ya se dio una vez en el indicador de Inicio.

**T0 va antes que T1.** Sin mocks que simulen un feed de miembros real, la
migración se hace a ciegas: la prueba de integración del falso cero de Inicio
pasaba antes y después de la corrección.

## Lo que se queda fuera, a propósito

- **Datos de contacto.** Ya están en D1 y son visibles por todos los miembros
  validados desde la ficha de miembro. No forman parte de Cartas.
- **Análisis de archivos de importación.** Se queda en el cliente: el archivo
  está en la máquina de la persona. `cardListImport.ts` no se mueve.
- **Anular una importación.** Necesitaría un `import_id` en cada oferta y un
  diario acotado. Se decidió esperar a ver si el aviso de duplicados y el modo
  sincronizar bastan. Si se retoma, será una tarea propia tras T5.
- **Mensajería y precios de referencia.** Límites conocidos de la sección, sin
  fecha.

## Convenciones que todas las tareas asumen

- El patrón de cada funcionalidad conectada: `migrations/NNNN_<tema>.sql` →
  `worker/<tema>.ts` (`matchXRoute`, `handleXApiRequest`, autorización con
  `authorizeApprovedMember` / `authorizeApprovedManager`) → `src/api/<tema>.ts`
  → `src/hooks/use<Tema>.ts`, cada capa con su prueba.
- Toda escritura comprueba la propiedad en el servidor: un miembro solo
  modifica lo suyo. La interfaz nunca es la frontera.
- Los textos visibles siguen en español; el resto de convenciones, en
  [`AGENTS.md`](../../../AGENTS.md).
