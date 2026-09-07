import { useState } from 'react'

import {
  cardConditionLabels,
  cardLanguageLabels,
} from '../../data/cardPresentation'
import type {
  CardCondition,
  CardLanguage,
  MarketplaceListing,
} from '../../domain/types'

export type ImportBulkField = 'language' | 'condition' | 'finish' | 'priceEur'

export type ImportBulkValues = {
  language?: CardLanguage
  condition?: CardCondition
  finish?: MarketplaceListing['finish']
  priceEur?: number
}

const languages = Object.keys(cardLanguageLabels) as CardLanguage[]
const conditions = Object.keys(cardConditionLabels) as CardCondition[]

export type ImportBulkEditorProps = {
  count: number
  fields: ImportBulkField[]
  onApply: (values: ImportBulkValues) => void
}

/**
 * Sets one value on every imported line at once. Only the fields actually
 * chosen are applied, so a bulk change never wipes what was tuned line by line.
 */
export function ImportBulkEditor({
  count,
  fields,
  onApply,
}: ImportBulkEditorProps) {
  const [language, setLanguage] = useState('')
  const [condition, setCondition] = useState('')
  const [finish, setFinish] = useState('')
  const [price, setPrice] = useState('')

  const values: ImportBulkValues = {
    ...(language ? { language: language as CardLanguage } : {}),
    ...(condition ? { condition: condition as CardCondition } : {}),
    ...(finish ? { finish: finish as MarketplaceListing['finish'] } : {}),
    ...(price && Number(price) > 0 ? { priceEur: Number(price) } : {}),
  }
  const hasValues = Object.keys(values).length > 0

  const apply = () => {
    onApply(values)
    setLanguage('')
    setCondition('')
    setFinish('')
    setPrice('')
  }

  return (
    <div
      className="import-bulk"
      aria-label="Aplicar un valor a todas las líneas"
    >
      <p>Aplicar a todas las líneas</p>
      <div className="import-bulk__fields">
        {fields.includes('language') ? (
          <label>
            <span>Idioma</span>
            <select
              aria-label="Idioma para todas las líneas"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              {languages.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {cardLanguageLabels[candidate]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {fields.includes('condition') ? (
          <label>
            <span>Estado</span>
            <select
              aria-label="Estado para todas las líneas"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              {conditions.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {cardConditionLabels[candidate]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {fields.includes('finish') ? (
          <label>
            <span>Acabado</span>
            <select
              aria-label="Acabado para todas las líneas"
              value={finish}
              onChange={(event) => setFinish(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              <option value="nonfoil">No foil</option>
              <option value="foil">Foil</option>
            </select>
          </label>
        ) : null}

        {fields.includes('priceEur') ? (
          <label>
            <span>Precio €</span>
            <input
              aria-label="Precio para todas las líneas"
              min={0}
              placeholder="Sin cambiar"
              step="0.01"
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      <button
        className="secondary-button"
        disabled={!hasValues}
        type="button"
        onClick={apply}
      >
        Aplicar a las {count} líneas
      </button>
    </div>
  )
}
