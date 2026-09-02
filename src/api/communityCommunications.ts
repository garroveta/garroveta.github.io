import type { NewsPost, NewsPostType } from '../domain/types'
import { apiRequest } from './client'

export type CommunityCommunication = NewsPost & {
  authorDisplayName: string
}

export type CommunityCommunicationWriteInput = {
  content: string
  excerpt: string
  pinned: boolean
  tagIds: string[]
  title: string
  type: NewsPostType
}

function communicationCollectionPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/communications`
}

function communicationPath(communityId: string, communicationId: string) {
  return `${communicationCollectionPath(communityId)}/${encodeURIComponent(communicationId)}`
}

export function listCommunityCommunications(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ communications: CommunityCommunication[] }>(
    communicationCollectionPath(communityId),
    { signal },
  )
}

export function createCommunityCommunication(
  communityId: string,
  input: CommunityCommunicationWriteInput,
) {
  return apiRequest<{ communication: CommunityCommunication }>(
    communicationCollectionPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'POST',
    },
  )
}

export function updateCommunityCommunication(
  communityId: string,
  communicationId: string,
  input: CommunityCommunicationWriteInput,
) {
  return apiRequest<{ communication: CommunityCommunication }>(
    communicationPath(communityId, communicationId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}

export function deleteCommunityCommunication(
  communityId: string,
  communicationId: string,
) {
  return apiRequest<{ deletedCommunicationId: string }>(
    communicationPath(communityId, communicationId),
    { method: 'DELETE' },
  )
}
