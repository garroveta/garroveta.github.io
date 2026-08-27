import type {
  Community,
  DemoDataSet,
  OpeningHours,
  Weekday,
} from '../domain/types'

export type CommunitySettingsInput = Pick<
  Community,
  'name' | 'city' | 'openingHours'
>

export const COMMUNITY_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const COMMUNITY_WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/

function isOpeningHoursEntryValid(entry: OpeningHours) {
  const isClosed = !entry.opensAt && !entry.closesAt

  if (isClosed) {
    return !entry.closesNextDay
  }

  return Boolean(
    entry.opensAt &&
    entry.closesAt &&
    entry.opensAt !== '24:00' &&
    timePattern.test(entry.opensAt) &&
    timePattern.test(entry.closesAt),
  )
}

export function isCommunitySettingsValid(input: CommunitySettingsInput) {
  const days = new Set(input.openingHours.map(({ day }) => day))

  return (
    input.name.trim().length >= 2 &&
    input.city.trim().length >= 2 &&
    input.openingHours.length === COMMUNITY_WEEKDAYS.length &&
    COMMUNITY_WEEKDAYS.every((day) => days.has(day)) &&
    input.openingHours.every(isOpeningHoursEntryValid)
  )
}

function normalizeOpeningHours(openingHours: OpeningHours[]) {
  return COMMUNITY_WEEKDAYS.map((day) => {
    const entry = openingHours.find((candidate) => candidate.day === day)

    if (!entry?.opensAt || !entry.closesAt) {
      return { day }
    }

    return {
      day,
      opensAt: entry.opensAt,
      closesAt: entry.closesAt,
      ...(entry.closesNextDay ? { closesNextDay: true } : {}),
    }
  })
}

export function updateCommunitySettings(
  data: DemoDataSet,
  managerId: string,
  input: CommunitySettingsInput,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role, status }) =>
      id === managerId && role === 'manager' && status === 'approved',
  )

  if (!manager || !isCommunitySettingsValid(input)) {
    return data
  }

  return {
    ...data,
    community: {
      ...data.community,
      name: input.name.trim(),
      city: input.city.trim(),
      openingHours: normalizeOpeningHours(input.openingHours),
    },
  }
}
