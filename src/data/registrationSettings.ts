import type {
  CommunityRegistrationSettings,
  DemoDataSet,
  EventType,
} from '../domain/types'
export {
  DEFAULT_COMMUNITY_REGISTRATION_SETTINGS,
  getRegistrationRule,
  isCommunityRegistrationSettingsValid,
} from '../domain/registrationSettings'
import { isCommunityRegistrationSettingsValid } from '../domain/registrationSettings'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: 'Torneo',
  league: 'Liga',
  draft: 'Draft',
  casual: 'Juego libre',
  workshop: 'Taller',
  launch: 'Presentación',
}

export function updateCommunityRegistrationSettings(
  data: DemoDataSet,
  managerId: string,
  settings: CommunityRegistrationSettings,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role, status }) =>
      id === managerId && role === 'manager' && status === 'approved',
  )

  if (!manager || !isCommunityRegistrationSettingsValid(settings)) {
    return data
  }

  return {
    ...data,
    registrationSettings: structuredClone(settings),
  }
}
