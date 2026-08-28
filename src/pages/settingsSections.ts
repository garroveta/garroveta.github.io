export type SettingsSection =
  | 'community'
  | 'options'
  | 'registrations'
  | 'invitations'
  | 'members'
  | 'communications'
  | 'ranking'

const settingsSections: SettingsSection[] = [
  'community',
  'options',
  'registrations',
  'invitations',
  'members',
  'communications',
  'ranking',
]

export function isSettingsSection(
  value: string | null,
): value is SettingsSection {
  return settingsSections.some((section) => section === value)
}
