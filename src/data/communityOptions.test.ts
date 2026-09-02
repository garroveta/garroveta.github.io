import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  addCommunityOption,
  deleteCommunityOption,
  getCommunityOptionUsageCount,
  reorderCommunityOption,
  setCommunityOptionActive,
  updateCommunityOption,
} from './communityOptions'

const managerId = 'member-lucia'

describe('community options', () => {
  it('lets a manager add, update, deactivate and reorder an option', () => {
    const added = addCommunityOption(structuredClone(demoData), managerId, {
      section: 'competitionEventKinds',
      name: 'Regional Qualifier',
      shortName: 'RCQ',
    })
    const newOption = added.competitionEventKinds.at(-1)

    expect(newOption).toMatchObject({
      id: 'event-kind-regional-qualifier',
      name: 'Regional Qualifier',
      shortName: 'RCQ',
      isActive: true,
    })

    const updated = updateCommunityOption(added, managerId, newOption!.id, {
      section: 'competitionEventKinds',
      name: 'Regional Championship Qualifier',
      shortName: 'RCQ',
    })
    const deactivated = setCommunityOptionActive(
      updated,
      managerId,
      'competitionEventKinds',
      newOption!.id,
      false,
    )
    const reordered = reorderCommunityOption(
      deactivated,
      managerId,
      'competitionEventKinds',
      newOption!.id,
      'up',
    )

    expect(reordered.competitionEventKinds.at(-2)).toMatchObject({
      id: newOption!.id,
      name: 'Regional Championship Qualifier',
      isActive: false,
    })
  })

  it('does not allow a player to change community options', () => {
    const result = addCommunityOption(
      structuredClone(demoData),
      'member-alex',
      {
        section: 'tags',
        name: 'Legacy',
        color: '#333333',
        tagKind: 'interest',
      },
    )

    expect(result).toEqual(demoData)
  })

  it('only permanently deletes options without historical references', () => {
    const data = structuredClone(demoData)
    const usedTagId = 'tag-commander'
    const unusedTagId = 'tag-unused'
    data.tags.push({
      id: unusedTagId,
      communityId: data.community.id,
      name: 'Sin uso',
      kind: 'interest',
      color: '#777777',
    })

    expect(
      getCommunityOptionUsageCount(data, 'tags', usedTagId),
    ).toBeGreaterThan(0)
    expect(deleteCommunityOption(data, managerId, 'tags', usedTagId)).toBe(data)

    const deleted = deleteCommunityOption(data, managerId, 'tags', unusedTagId)
    expect(deleted.tags.some(({ id }) => id === unusedTagId)).toBe(false)
  })
})
