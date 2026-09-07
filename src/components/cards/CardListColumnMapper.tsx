import type {
  CardListColumn,
  CardListColumnMapping,
  CardListColumnOverrides,
} from '../../data/cardListImport'

const columnLabels: Record<CardListColumn, string> = {
  name: 'Nombre de la carta',
  quantity: 'Cantidad',
  setCode: 'Código de edición',
  collectorNumber: 'Número de coleccionista',
  scryfallId: 'Identificador Scryfall',
  language: 'Idioma',
  condition: 'Estado',
  finish: 'Acabado',
  priceEur: 'Precio',
}

const columnOrder = Object.keys(columnLabels) as CardListColumn[]

export type CardListColumnMapperProps = {
  columns: CardListColumnMapping[]
  overrides: CardListColumnOverrides
  onChange: (overrides: CardListColumnOverrides) => void
}

export function CardListColumnMapper({
  columns,
  overrides,
  onChange,
}: CardListColumnMapperProps) {
  if (columns.length === 0) {
    return null
  }

  const hasName = columns.some(({ column }) => column === 'name')

  return (
    <details className="column-mapper" open={!hasName}>
      <summary>Columnas del archivo</summary>
      <p className="column-mapper__help">
        Cambia aquí lo que no se haya reconocido. Cada dato se toma de una sola
        columna.
      </p>
      <div className="column-mapper__rows">
        {columns.map(({ header, column }, index) => (
          <label key={`${index}-${header}`}>
            <span>{header.trim() || `Columna ${index + 1}`}</span>
            <select
              aria-label={`Contenido de la columna ${header.trim() || index + 1}`}
              value={column ?? 'none'}
              onChange={(event) =>
                onChange({
                  ...overrides,
                  [index]: event.target.value as CardListColumn | 'none',
                })
              }
            >
              <option value="none">No importar</option>
              {columnOrder.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {columnLabels[candidate]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </details>
  )
}
