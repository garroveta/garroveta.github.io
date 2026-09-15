export function addCalendarDays(date: string, days: number) {
  const nextDate = new Date(`${date}T12:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

export function madridDatePart(isoDate: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(isoDate))
}

export function madridTimePart(isoDate: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Madrid',
  }).format(new Date(isoDate))
}

export function buildMadridIso(date: string, time: string) {
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find(({ type }) => type === 'timeZoneName')
    ?.value.replace('GMT', '')

  return `${date}T${time}:00${offsetName || '+01:00'}`
}
