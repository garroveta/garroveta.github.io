import { X } from 'lucide-react'
import { useEffect } from 'react'

import { BadgeMark } from './BadgeMark'
import type { ResolvedBadge } from '../domain/badges'

export type BadgePreviewSubject = {
  definition: ResolvedBadge
  unlocked: boolean
  progress?: { current: number; target: number }
  glyph?: string
}

type BadgePreviewProps = {
  badge: BadgePreviewSubject
  onClose: () => void
}

/** The badge at a size where the artwork can actually be looked at. */
export function BadgePreview({ badge, onClose }: BadgePreviewProps) {
  const { definition, glyph, progress, unlocked } = badge

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="card-image-preview badge-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-preview-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="card-image-preview__panel badge-preview__panel">
        <button
          className="card-image-preview__close"
          type="button"
          aria-label="Cerrar insignia"
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
        <BadgeMark
          badgeId={definition.id}
          glyph={glyph}
          label={`${definition.name}, ampliada`}
          progress={progress}
          unlocked={unlocked}
          variant="large"
        />
        <div>
          <h2 id="badge-preview-title">{definition.name}</h2>
          <p>{definition.description}</p>
          {progress && !unlocked ? (
            <p className="badge-preview__progress">
              {progress.current} de {progress.target}
            </p>
          ) : null}
          <p className="badge-preview__reference">{definition.reference}</p>
        </div>
      </div>
    </div>
  )
}
