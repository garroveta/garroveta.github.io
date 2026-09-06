import type {
  CardCondition,
  CardLanguage,
  MarketplaceListing,
} from '../domain/types'

export type CardListSection =
  'main' | 'sideboard' | 'maybeboard' | 'commander' | 'companion'

export type CardListSource = 'manabox_csv' | 'text'

export type CardFinish = MarketplaceListing['finish']

export type ParsedCardListItem = {
  lineNumber: number
  rawLine: string
  quantity: number
  name: string
  setCode?: string
  collectorNumber?: string
  scryfallId?: string
  section: CardListSection
  /** Commercial attributes, filled only by exports that carry them. */
  language?: CardLanguage
  condition?: CardCondition
  finish?: CardFinish
  priceEur?: number
}

export type ParsedCardList = {
  source: CardListSource
  items: ParsedCardListItem[]
  ignoredLines: string[]
  errors: Array<{ lineNumber: number; line: string; message: string }>
}

const sectionLabels = new Map<string, CardListSection>([
  ['main', 'main'],
  ['mainboard', 'main'],
  ['deck', 'main'],
  ['sideboard', 'sideboard'],
  ['maybeboard', 'maybeboard'],
  ['maybe board', 'maybeboard'],
  ['commander', 'commander'],
  ['companion', 'companion'],
])

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase('en')
}

function parseCsvRows(value: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (character === ',' && !quoted) {
      row.push(field)
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && value[index + 1] === '\n') {
        index += 1
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    field += character
  }

  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function looksLikeManaBoxCsv(value: string) {
  const firstLine = value.split(/\r?\n/, 1)[0] ?? ''
  const headers = parseCsvRows(firstLine)[0]?.map(normalizeHeader) ?? []

  return (
    headers.includes('name') &&
    headers.includes('quantity') &&
    headers.includes('scryfall id')
  )
}

const manaBoxLanguages = new Map<string, CardLanguage>([
  ['en', 'en'],
  ['english', 'en'],
  ['es', 'es'],
  ['spanish', 'es'],
  ['espanol', 'es'],
  ['fr', 'fr'],
  ['french', 'fr'],
  ['de', 'de'],
  ['german', 'de'],
  ['deutsch', 'de'],
  ['it', 'it'],
  ['italian', 'it'],
  ['italiano', 'it'],
  ['pt', 'pt'],
  ['pt-br', 'pt'],
  ['portuguese', 'pt'],
  ['ja', 'jp'],
  ['jp', 'jp'],
  ['japanese', 'jp'],
])

/**
 * An unlisted language (Korean, Russian, Chinese…) is reported as `other`:
 * leaving it empty would silently fall back to the Spanish default.
 */
function parseManaBoxLanguage(value: string | undefined) {
  const normalized = normalizeHeader(value ?? '')

  if (!normalized) {
    return undefined
  }

  return manaBoxLanguages.get(normalized) ?? 'other'
}

const manaBoxConditions = new Map<string, CardCondition>([
  ['mint', 'mint'],
  ['m', 'mint'],
  ['near_mint', 'near_mint'],
  ['near mint', 'near_mint'],
  ['nm', 'near_mint'],
  ['excellent', 'excellent'],
  ['ex', 'excellent'],
  ['good', 'good'],
  ['gd', 'good'],
  ['light_played', 'light_played'],
  ['lightly played', 'light_played'],
  ['lp', 'light_played'],
  ['played', 'played'],
  ['pl', 'played'],
  ['poor', 'poor'],
  ['po', 'poor'],
])

const manaBoxFinishes = new Map<string, CardFinish>([
  ['normal', 'nonfoil'],
  ['nonfoil', 'nonfoil'],
  ['false', 'nonfoil'],
  ['foil', 'foil'],
  ['etched', 'foil'],
  ['true', 'foil'],
])

function parseManaBoxCsv(value: string): ParsedCardList {
  const rows = parseCsvRows(value)
  const headers = (rows.shift() ?? []).map(normalizeHeader)
  const indexOf = (header: string) => headers.indexOf(header)
  const items: ParsedCardListItem[] = []
  const errors: ParsedCardList['errors'] = []

  rows.forEach((row, rowIndex) => {
    if (row.every((field) => !field.trim())) {
      return
    }

    const lineNumber = rowIndex + 2
    const name = row[indexOf('name')]?.trim() ?? ''
    const quantity = Number(row[indexOf('quantity')] ?? 1)

    if (!name || !Number.isInteger(quantity) || quantity < 1) {
      errors.push({
        lineNumber,
        line: row.join(','),
        message: 'Nombre o cantidad no válidos.',
      })
      return
    }

    items.push({
      lineNumber,
      rawLine: row.join(','),
      quantity,
      name,
      setCode: row[indexOf('set code')]?.trim() || undefined,
      collectorNumber: row[indexOf('collector number')]?.trim() || undefined,
      scryfallId: row[indexOf('scryfall id')]?.trim() || undefined,
      section: 'main',
      language: parseManaBoxLanguage(row[indexOf('language')]),
      condition: manaBoxConditions.get(
        normalizeHeader(row[indexOf('condition')] ?? ''),
      ),
      finish: manaBoxFinishes.get(normalizeHeader(row[indexOf('foil')] ?? '')),
      // `Purchase price` is what the owner paid, not a sale price: never
      // publish it as one.
    })
  })

  return { source: 'manabox_csv', items, ignoredLines: [], errors }
}

function parseSection(line: string) {
  const normalized = line
    .replace(/^\/\/\s*/, '')
    .replace(/:$/, '')
    .trim()
    .toLocaleLowerCase('en')

  return sectionLabels.get(normalized)
}

function parseTextItem(
  line: string,
  lineNumber: number,
  section: CardListSection,
): ParsedCardListItem | undefined {
  const quantityMatch = line.match(/^(?:(\d+)\s*x?\s+)?(.+)$/i)

  if (!quantityMatch) {
    return undefined
  }

  const quantity = quantityMatch[1] ? Number(quantityMatch[1]) : 1
  const cardText = quantityMatch[2].trim()
  const printingMatch = cardText.match(/^(.+?)\s+\(([A-Z0-9]+)\)\s+([^\s]+)$/i)
  const name = (printingMatch?.[1] ?? cardText).trim()

  if (!name || !Number.isInteger(quantity) || quantity < 1) {
    return undefined
  }

  return {
    lineNumber,
    rawLine: line,
    quantity,
    name,
    setCode: printingMatch?.[2]?.toUpperCase(),
    collectorNumber: printingMatch?.[3],
    section,
  }
}

function parseTextList(value: string): ParsedCardList {
  const items: ParsedCardListItem[] = []
  const ignoredLines: string[] = []
  const errors: ParsedCardList['errors'] = []
  let section: CardListSection = 'main'

  value.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim()
    const lineNumber = index + 1

    if (!line) {
      return
    }

    const nextSection = parseSection(line)

    if (nextSection) {
      section = nextSection
      ignoredLines.push(line)
      return
    }

    if (line.startsWith('//') || line.startsWith('#')) {
      ignoredLines.push(line)
      return
    }

    const item = parseTextItem(line, lineNumber, section)

    if (item) {
      items.push(item)
    } else {
      errors.push({
        lineNumber,
        line,
        message: 'Línea no reconocida.',
      })
    }
  })

  return { source: 'text', items, ignoredLines, errors }
}

export function parseCardList(value: string): ParsedCardList {
  const normalizedValue = value.replace(/^\uFEFF/, '').trim()

  if (!normalizedValue) {
    return { source: 'text', items: [], ignoredLines: [], errors: [] }
  }

  return looksLikeManaBoxCsv(normalizedValue)
    ? parseManaBoxCsv(normalizedValue)
    : parseTextList(normalizedValue)
}
