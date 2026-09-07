import type {
  CardCondition,
  CardLanguage,
  MarketplaceListing,
} from '../domain/types'

export type CardListSection =
  'main' | 'sideboard' | 'maybeboard' | 'commander' | 'companion'

export type CardListSource = 'manabox_csv' | 'csv' | 'text'

/** The fields a CSV column can feed, whatever the tool that produced it. */
export type CardListColumn =
  | 'name'
  | 'quantity'
  | 'setCode'
  | 'collectorNumber'
  | 'scryfallId'
  | 'language'
  | 'condition'
  | 'finish'
  | 'priceEur'

export type CardListColumnMapping = {
  header: string
  column?: CardListColumn
}

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
  /** Columns of a CSV and the field each one feeds, for review and remapping. */
  columns?: CardListColumnMapping[]
  delimiter?: string
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

function parseCsvRows(value: string, delimiter = ',') {
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

    if (character === delimiter && !quoted) {
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

const DELIMITERS = [',', ';', '\t']

/** Picks the separator that splits the header row into the most columns. */
function detectDelimiter(firstLine: string) {
  return DELIMITERS.reduce((best, candidate) => {
    const count = parseCsvRows(firstLine, candidate)[0]?.length ?? 0
    const bestCount = parseCsvRows(firstLine, best)[0]?.length ?? 0

    return count > bestCount ? candidate : best
  }, DELIMITERS[0])
}

/**
 * Header spellings met in the wild: ManaBox, the Cardmarket browser
 * extensions, TCG Automate and hand-made spreadsheets, in several languages.
 */
const columnAliases = new Map<string, CardListColumn>([
  ['name', 'name'],
  ['card', 'name'],
  ['card name', 'name'],
  ['cardname', 'name'],
  ['english name', 'name'],
  ['nombre', 'name'],
  ['carta', 'name'],
  ['nombre de la carta', 'name'],
  ['product', 'name'],
  ['produkt', 'name'],
  ['kartenname', 'name'],
  ['article', 'name'],
  ['artikel', 'name'],
  ['nom', 'name'],
  ['quantity', 'quantity'],
  ['qty', 'quantity'],
  ['amount', 'quantity'],
  ['count', 'quantity'],
  ['cantidad', 'quantity'],
  ['unidades', 'quantity'],
  ['anzahl', 'quantity'],
  ['menge', 'quantity'],
  ['quantite', 'quantity'],
  ['set code', 'setCode'],
  ['setcode', 'setCode'],
  ['set', 'setCode'],
  ['edition', 'setCode'],
  ['edicion', 'setCode'],
  ['expansion', 'setCode'],
  ['expansion code', 'setCode'],
  ['erweiterung', 'setCode'],
  ['collector number', 'collectorNumber'],
  ['collectornumber', 'collectorNumber'],
  ['card number', 'collectorNumber'],
  ['number', 'collectorNumber'],
  ['numero', 'collectorNumber'],
  ['nummer', 'collectorNumber'],
  ['scryfall id', 'scryfallId'],
  ['scryfallid', 'scryfallId'],
  ['scryfall', 'scryfallId'],
  ['language', 'language'],
  ['lang', 'language'],
  ['idioma', 'language'],
  ['sprache', 'language'],
  ['langue', 'language'],
  ['condition', 'condition'],
  ['cond', 'condition'],
  ['estado', 'condition'],
  ['zustand', 'condition'],
  ['etat', 'condition'],
  ['foil', 'finish'],
  ['finish', 'finish'],
  ['is foil', 'finish'],
  ['acabado', 'finish'],
  ['price', 'priceEur'],
  ['price eur', 'priceEur'],
  ['selling price', 'priceEur'],
  ['precio', 'priceEur'],
  ['preis', 'priceEur'],
  ['prix', 'priceEur'],
])

function normalizeValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en')
}

export function mapCardListColumns(headers: string[]): CardListColumnMapping[] {
  const used = new Set<CardListColumn>()

  return headers.map((header) => {
    const column = columnAliases.get(normalizeValue(header))

    if (!column || used.has(column)) {
      return { header }
    }

    used.add(column)
    return { header, column }
  })
}

const cardLanguageValues = new Map<string, CardLanguage>([
  ['en', 'en'],
  ['english', 'en'],
  ['ingles', 'en'],
  ['englisch', 'en'],
  ['es', 'es'],
  ['spanish', 'es'],
  ['espanol', 'es'],
  ['spanisch', 'es'],
  ['fr', 'fr'],
  ['french', 'fr'],
  ['frances', 'fr'],
  ['francais', 'fr'],
  ['de', 'de'],
  ['german', 'de'],
  ['deutsch', 'de'],
  ['aleman', 'de'],
  ['it', 'it'],
  ['italian', 'it'],
  ['italiano', 'it'],
  ['pt', 'pt'],
  ['pt-br', 'pt'],
  ['portuguese', 'pt'],
  ['portugues', 'pt'],
  ['ja', 'jp'],
  ['jp', 'jp'],
  ['japanese', 'jp'],
  ['japones', 'jp'],
])

/**
 * An unlisted language (Korean, Russian, Chinese…) is reported as `other`:
 * leaving it empty would silently fall back to the Spanish default.
 */
function parseCardLanguage(value: string | undefined) {
  const normalized = normalizeValue(value ?? '')

  if (!normalized) {
    return undefined
  }

  return cardLanguageValues.get(normalized) ?? 'other'
}

/** The seven Cardmarket grades, by full name and by the usual two-letter code. */
const cardConditionValues = new Map<string, CardCondition>([
  ['mint', 'mint'],
  ['m', 'mint'],
  ['mt', 'mint'],
  ['near_mint', 'near_mint'],
  ['near mint', 'near_mint'],
  ['nm', 'near_mint'],
  ['excellent', 'excellent'],
  ['ex', 'excellent'],
  ['good', 'good'],
  ['gd', 'good'],
  ['light_played', 'light_played'],
  ['lightly played', 'light_played'],
  ['light played', 'light_played'],
  ['lp', 'light_played'],
  ['played', 'played'],
  ['pl', 'played'],
  ['poor', 'poor'],
  ['po', 'poor'],
])

const cardFinishValues = new Map<string, CardFinish>([
  ['normal', 'nonfoil'],
  ['nonfoil', 'nonfoil'],
  ['non-foil', 'nonfoil'],
  ['false', 'nonfoil'],
  ['no', 'nonfoil'],
  ['0', 'nonfoil'],
  ['foil', 'foil'],
  ['etched', 'foil'],
  ['true', 'foil'],
  ['yes', 'foil'],
  ['1', 'foil'],
  ['x', 'foil'],
])

/** Reads `1.50`, `1,50` and `1,50 €` alike. */
function parsePrice(value: string | undefined) {
  const normalized = (value ?? '').replace(/[^\d,.-]/g, '').trim()

  if (!normalized) {
    return undefined
  }

  const decimal = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized
  const price = Number(decimal)

  return Number.isFinite(price) && price > 0
    ? Math.round(price * 100) / 100
    : undefined
}

/** A set code is short and unspaced; a set name is not usable for resolution. */
function parseSetCode(value: string | undefined) {
  const code = value?.trim() ?? ''

  return code && code.length <= 6 && !code.includes(' ')
    ? code.toUpperCase()
    : undefined
}

function looksLikeManaBoxCsv(headers: string[]) {
  const normalized = headers.map(normalizeValue)

  return (
    normalized.includes('name') &&
    normalized.includes('quantity') &&
    normalized.includes('scryfall id')
  )
}

function parseCsv(value: string, delimiter: string): ParsedCardList {
  const rows = parseCsvRows(value, delimiter)
  const headers = rows.shift() ?? []
  const columns = mapCardListColumns(headers)
  const indexOf = (column: CardListColumn) =>
    columns.findIndex((candidate) => candidate.column === column)
  const fieldOf = (row: string[], column: CardListColumn) => {
    const index = indexOf(column)

    return index < 0 ? undefined : row[index]
  }
  const items: ParsedCardListItem[] = []
  const errors: ParsedCardList['errors'] = []

  rows.forEach((row, rowIndex) => {
    if (row.every((field) => !field.trim())) {
      return
    }

    const lineNumber = rowIndex + 2
    const name = fieldOf(row, 'name')?.trim() ?? ''
    const rawQuantity = fieldOf(row, 'quantity')?.trim()
    const quantity = rawQuantity ? Number(rawQuantity) : 1

    if (!name || !Number.isInteger(quantity) || quantity < 1) {
      errors.push({
        lineNumber,
        line: row.join(delimiter),
        message: 'Nombre o cantidad no válidos.',
      })
      return
    }

    items.push({
      lineNumber,
      rawLine: row.join(delimiter),
      quantity,
      name,
      setCode: parseSetCode(fieldOf(row, 'setCode')),
      collectorNumber: fieldOf(row, 'collectorNumber')?.trim() || undefined,
      scryfallId: fieldOf(row, 'scryfallId')?.trim() || undefined,
      section: 'main',
      language: parseCardLanguage(fieldOf(row, 'language')),
      condition: cardConditionValues.get(
        normalizeValue(fieldOf(row, 'condition') ?? ''),
      ),
      finish: cardFinishValues.get(
        normalizeValue(fieldOf(row, 'finish') ?? ''),
      ),
      priceEur: parsePrice(fieldOf(row, 'priceEur')),
    })
  })

  return {
    source: looksLikeManaBoxCsv(headers) ? 'manabox_csv' : 'csv',
    items,
    ignoredLines: [],
    errors,
    columns,
    delimiter,
  }
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

  const firstLine = normalizedValue.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const headers = parseCsvRows(firstLine, delimiter)[0] ?? []
  const columns = mapCardListColumns(headers)
  // A CSV is recognised by having several columns, one of which names the card.
  const looksLikeCsv =
    headers.length > 1 && columns.some(({ column }) => column === 'name')

  return looksLikeCsv
    ? parseCsv(normalizedValue, delimiter)
    : parseTextList(normalizedValue)
}
