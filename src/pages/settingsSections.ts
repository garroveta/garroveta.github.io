export type SettingsSection =
  | 'community'
  | 'options'
  | 'registrations'
  | 'invitations'
  | 'members'
  | 'communications'
  | 'ranking'
  | 'insignias'

const settingsSections: SettingsSection[] = [
  'community',
  'options',
  'registrations',
  'invitations',
  'members',
  'communications',
  'ranking',
  'insignias',
]

export function isSettingsSection(
  value: string | null,
): value is SettingsSection {
  return settingsSections.some((section) => section === value)
}
