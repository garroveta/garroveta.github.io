import { X } from 'lucide-react'

import { getScryfallCardImage } from '../data/scryfallImages'
import type { Card } from '../domain/types'

type CardImagePreviewProps = {
  card: Card
  description: string
  onClose: () => void
}

export function CardImagePreview({
  card,
  description,
  onClose,
}: CardImagePreviewProps) {
  const imageUrl = getScryfallCardImage(card.name, card.imageUri)

  return (
    <div
      className="card-image-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-image-preview-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="card-image-preview__panel">
        <button
          className="card-image-preview__close"
          type="button"
          aria-label="Cerrar imagen"
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
        {imageUrl ? (
          <img src={imageUrl} alt={`${card.name}, imagen ampliada`} />
        ) : null}
        <div>
          <h2 id="card-image-preview-title">{card.name}</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}
