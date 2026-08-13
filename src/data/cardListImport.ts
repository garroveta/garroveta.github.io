export type CardListSection =
  'main' | 'sideboard' | 'maybeboard' | 'commander' | 'companion'

export type CardListSource = 'manabox_csv' | 'text'

export type ParsedCardListItem = {
  lineNumber: number
  rawLine: string
  quantity: number
  name: string
  setCode?: string
  collectorNumber?: string
  scryfallId?: string
  section: CardListSection
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
