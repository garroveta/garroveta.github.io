import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  isCommunitySettingsValid,
  updateCommunitySettings,
} from './communitySettings'

describe('community settings', () => {
  it('lets the approved manager update identity and opening hours', () => {
    const input = {
      name: 'CRC Delorean Inca',
      city: 'Palma',
      address: 'Carrer Major, 12',
      contactEmail: 'hola@delorean.example',
      contactPhone: '+34 971 00 00 00',
      websiteUrl: 'https://delorean.example',
      instagramUrl: 'https://instagram.com/delorean',
      facebookUrl: '',
      logoUrl: 'https://delorean.example/logo.png',
      openingHours: demoData.community.openingHours.map((entry) =>
        entry.day === 'wednesday' ? { ...entry, opensAt: '18:00' } : entry,
      ),
    }

    const updated = updateCommunitySettings(
      structuredClone(demoData),
      'member-lucia',
      input,
    )

    expect(updated.community).toMatchObject({
      name: 'CRC Delorean Inca',
      city: 'Palma',
      address: 'Carrer Major, 12',
      contactEmail: 'hola@delorean.example',
      websiteUrl: 'https://delorean.example',
      logoUrl: 'https://delorean.example/logo.png',
    })
    expect(
      updated.community.openingHours.find(({ day }) => day === 'wednesday'),
    ).toMatchObject({ opensAt: '18:00', closesAt: '24:00' })
  })

  it('rejects incomplete schedules and changes from a player', () => {
    const incompleteSettings = {
      name: 'CRC Delorean',
      city: 'Inca',
      contactEmail: 'correo-invalido',
      openingHours: demoData.community.openingHours.slice(0, 6),
    }

    expect(isCommunitySettingsValid(incompleteSettings)).toBe(false)
    expect(
      updateCommunitySettings(demoData, demoData.currentMemberId, {
        name: 'Otra comunidad',
        city: 'Inca',
        websiteUrl: 'javascript:alert(1)',
        openingHours: demoData.community.openingHours,
      }),
    ).toBe(demoData)
  })

  it('rejects invalid optional contact details', () => {
    const validSettings = {
      name: 'CRC Delorean',
      city: 'Inca',
      openingHours: demoData.community.openingHours,
    }

    expect(
      isCommunitySettingsValid({
        ...validSettings,
        contactEmail: 'correo-invalido',
      }),
    ).toBe(false)
    expect(
      isCommunitySettingsValid({
        ...validSettings,
        contactPhone: '123',
      }),
    ).toBe(false)
    expect(
      isCommunitySettingsValid({
        ...validSettings,
        websiteUrl: 'javascript:alert(1)',
      }),
    ).toBe(false)
  })
})
