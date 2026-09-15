# Insignias — documentación

Un archivo por insignia, con su prompt de generación y sus referencias en las
fuentes oficiales de Magic: The Gathering. Se consulta al crear una insignia
nueva o al regenerar el arte de una existente; las convenciones de nombrado,
rutas y formatos de archivo están en [`AGENTS.md`](../../AGENTS.md).

Las insignias están definidas en `src/domain/badges.ts` (`SEASON_BADGES`),
agrupadas en escalas («ladders») por lo que miden. Cada fila de la tabla es
una escala, de la insignia más accesible a la más difícil:

| Escala              | Insignias (de bronce a oro)                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Eventos jugados     | [`vigilance`](./vigilance.md) · [`persist`](./persist.md) · [`saga`](./saga.md)                                             |
| Top 4               | [`ferocious`](./ferocious.md) · [`citys-blessing`](./citys-blessing.md) · [`prowess`](./prowess.md) · [`storm`](./storm.md) |
| Victorias           | [`deathtouch`](./deathtouch.md) · [`annihilator`](./annihilator.md) · [`legendary`](./legendary.md)                         |
| Formatos            | [`metalcraft`](./metalcraft.md) · [`delirium`](./delirium.md) · [`domain`](./domain.md) · [`changeling`](./changeling.md)   |
| Torneos grandes     | [`melee`](./melee.md)                                                                                                       |
| Clasificación final | [`paragon`](./paragon.md) · [`monarch`](./monarch.md)                                                                       |

Las dos últimas no forman una progresión de umbrales como las demás: `melee`
se obtiene con un único gran torneo ganado, y `paragon`/`monarch` premian una
posición concreta en la clasificación final de temporada.
