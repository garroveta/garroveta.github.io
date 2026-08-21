export type EventLinkStandingRow = {
  rank: number
  displayName: string
  eventPoints: number
  wins: number
  losses: number
  draws: number
  opponentMatchWinPercentage: number
  gameWinPercentage: number
  opponentGameWinPercentage: number
}

export type ParsedEventLinkStanding = {
  eventTitle?: string
  storeId?: string
  externalEventId?: string
  roundNumber?: number
  completed: boolean
  rows: EventLinkStandingRow[]
  warnings: string[]
}

export type EventLinkParseResult = {
  standing?: ParsedEventLinkStanding
  errors: string[]
}

type StandingColumn =
  | 'rank'
  | 'name'
  | 'points'
  | 'record'
  | 'omw'
  | 'gwp'
  | 'ogwp'

const requiredColumns: StandingColumn[] = [
  'rank',
  'name',
  'points',
  'record',
  'omw',
  'gwp',
  'ogwp',
]

const headerAliases = new Map<string, StandingColumn>([
  ['puesto', 'rank'],
  ['pos', 'rank'],
  ['position', 'rank'],
  ['rank', 'rank'],
  ['nombre', 'name'],
  ['jugador', 'name'],
  ['name', 'name'],
  ['player', 'name'],
  ['puntos', 'points'],
  ['points', 'points'],
  ['pts', 'points'],
  ['v/d/e', 'record'],
  ['w/l/d', 'record'],
  ['w-d-d', 'record'],
  ['record', 'record'],
  ['vpo', 'omw'],
  ['omw', 'omw'],
  ['omw%', 'omw'],
  ['jg', 'gwp'],
  ['gw', 'gwp'],
  ['gw%', 'gwp'],
  ['jgo', 'ogwp'],
  ['ogw', 'ogwp'],
  ['ogw%', 'ogwp'],
])

function normalizedText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizedHeader(value: string) {
  return normalizedText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^%/, '')
    .toLocaleLowerCase('es')
}

function parseInteger(value: string) {
  const parsed = Number(normalizedText(value))
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function parsePercentage(value: string) {
  const parsed = Number(
    normalizedText(value).replace('%', '').replace(',', '.'),
  )

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : undefined
}

function findStandingTable(document: Document) {
  const tables = Array.from(document.querySelectorAll('table'))

  return tables.find((table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(
      (header) => headerAliases.get(normalizedHeader(header.textContent ?? '')),
    )

    return requiredColumns.every((column) => headers.includes(column))
  })
}

function parseSourceMetadata(html: string, document: Document) {
  const sourceUrl = html.match(
    /https:\/\/eventlink\.wizards\.com\/stores\/(\d+)\/events\/(\d+)\/rounds\/(\d+)\/(?:standings|pairings)/i,
  )
  const routeElement = document.querySelector<HTMLElement>(
    '[storeid][eventid][roundnumber]',
  )
  const roundText = normalizedText(
    document.querySelector('.round-timer__round-number')?.textContent ?? '',
  )

  return {
    storeId: sourceUrl?.[1] ?? routeElement?.getAttribute('storeid') ?? undefined,
    externalEventId:
      sourceUrl?.[2] ?? routeElement?.getAttribute('eventid') ?? undefined,
    roundNumber:
      parseInteger(sourceUrl?.[3] ?? '') ??
      parseInteger(routeElement?.getAttribute('roundnumber') ?? '') ??
      parseInteger(roundText.replace(/\D+/g, '')),
  }
}

export function parseEventLinkHtml(html: string): EventLinkParseResult {
  if (!normalizedText(html)) {
    return { errors: ['El archivo está vacío.'] }
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  const table = findStandingTable(document)

  if (!table) {
    return {
      errors: [
        'No se ha encontrado una tabla de clasificación EventLink válida.',
      ],
    }
  }

  const headers = Array.from(table.querySelectorAll('thead th')).map((header) =>
    headerAliases.get(normalizedHeader(header.textContent ?? '')),
  )
  const columnIndex = new Map<StandingColumn, number>()

  headers.forEach((column, index) => {
    if (column && !columnIndex.has(column)) {
      columnIndex.set(column, index)
    }
  })

  const rows: EventLinkStandingRow[] = []
  const errors: string[] = []

  Array.from(table.querySelectorAll('tbody tr')).forEach((row, rowIndex) => {
    const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
      normalizedText(cell.textContent ?? ''),
    )
    const value = (column: StandingColumn) =>
      cells[columnIndex.get(column) ?? -1] ?? ''
    const rank = parseInteger(value('rank'))
    const displayName = value('name')
    const eventPoints = parseInteger(value('points'))
    const record = value('record').match(/^(\d+)\s*[/\-]\s*(\d+)\s*[/\-]\s*(\d+)$/)
    const opponentMatchWinPercentage = parsePercentage(value('omw'))
    const gameWinPercentage = parsePercentage(value('gwp'))
    const opponentGameWinPercentage = parsePercentage(value('ogwp'))

    if (
      rank === undefined ||
      !displayName ||
      eventPoints === undefined ||
      !record ||
      opponentMatchWinPercentage === undefined ||
      gameWinPercentage === undefined ||
      opponentGameWinPercentage === undefined
    ) {
      errors.push(`La fila ${rowIndex + 1} contiene datos no válidos.`)
      return
    }

    rows.push({
      rank,
      displayName,
      eventPoints,
      wins: Number(record[1]),
      losses: Number(record[2]),
      draws: Number(record[3]),
      opponentMatchWinPercentage,
      gameWinPercentage,
      opponentGameWinPercentage,
    })
  })

  if (rows.length === 0) {
    errors.push('La clasificación no contiene ningún jugador válido.')
  }

  if (errors.length > 0) {
    return { errors }
  }

  const metadata = parseSourceMetadata(html, document)
  const completedText = normalizedText(
    document.querySelector('.round-timer__complete')?.textContent ?? '',
  ).toLocaleLowerCase('es')
  const completed =
    completedText.includes('complet') || completedText.includes('complete')
  const warnings: string[] = []

  if (!completed) {
    warnings.push('La ronda no parece estar marcada como finalizada.')
  }

  return {
    errors: [],
    standing: {
      eventTitle:
        normalizedText(
          document.querySelector('.event-page-header__title')?.textContent ?? '',
        ) || undefined,
      ...metadata,
      completed,
      rows,
      warnings,
    },
  }
}
