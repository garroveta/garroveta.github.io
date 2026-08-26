import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  getRegistrationRule,
  isCommunityRegistrationSettingsValid,
  updateCommunityRegistrationSettings,
} from './registrationSettings'

describe('community registration settings', () => {
  it('updates defaults when the approved manager saves valid settings', () => {
    const settings = structuredClone(demoData.registrationSettings)
    const draft = settings.rules.find(({ eventType }) => eventType === 'draft')!
    draft.defaultCapacity = 4
    draft.waitlistEnabled = false

    const updated = updateCommunityRegistrationSettings(
      demoData,
      'member-lucia',
      settings,
    )

    expect(getRegistrationRule(updated.registrationSettings, 'draft')).toEqual(
      expect.objectContaining({
        defaultCapacity: 4,
        waitlistEnabled: false,
      }),
    )
  })

  it('rejects invalid capacities and changes from a player', () => {
    const settings = structuredClone(demoData.registrationSettings)
    settings.rules[0].defaultCapacity = 0

    expect(isCommunityRegistrationSettingsValid(settings)).toBe(false)
    expect(
      updateCommunityRegistrationSettings(
        demoData,
        demoData.currentMemberId,
        demoData.registrationSettings,
      ),
    ).toBe(demoData)
  })
})
