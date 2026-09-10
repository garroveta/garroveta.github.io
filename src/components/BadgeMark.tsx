import { useId, useState } from 'react'

const SIZE = 44
const RADIUS = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type BadgeMarkProps = {
  badgeId: string
  label: string
  glyph?: string
  progress?: { current: number; target: number }
  unlocked: boolean
}

/**
 * One container for every badge: the ring carries the distance, and the middle
 * carries either the threshold or the artwork. A locked badge shows its art as
 * a faded silhouette so a member can see what they are playing for.
 *
 * Artwork is looked up by badge id, never by name, so renaming a badge in the
 * settings keeps its image. A missing file simply falls back to the threshold,
 * which lets the catalogue be illustrated one badge at a time.
 */
export function BadgeMark({
  badgeId,
  label,
  glyph,
  progress,
  unlocked,
}: BadgeMarkProps) {
  const titleId = useId()
  const [hasArtwork, setHasArtwork] = useState(true)
  const ratio =
    unlocked || !progress
      ? 1
      : Math.min(1, Math.max(0, progress.current / progress.target))

  return (
    <span
      className="badge-mark"
      data-artwork={hasArtwork}
      data-unlocked={unlocked}
      role="img"
      aria-labelledby={titleId}
    >
      <span className="visually-hidden" id={titleId}>
        {label}
      </span>

      <svg
        className="badge-mark__frame"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle
          className="badge-mark__disc"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
        />
        <circle
          className="badge-mark__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
        />
        {unlocked || ratio === 0 ? null : (
          <circle
            className="badge-mark__ring"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeDasharray={`${CIRCUMFERENCE * ratio} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </svg>

      {hasArtwork ? (
        <img
          className="badge-mark__art"
          src={`${import.meta.env.BASE_URL}badges/${badgeId}.png`}
          alt=""
          loading="lazy"
          onError={() => setHasArtwork(false)}
        />
      ) : null}

      {unlocked && hasArtwork ? null : (
        <span className="badge-mark__value" aria-hidden="true">
          {glyph ?? progress?.target ?? ''}
        </span>
      )}
    </span>
  )
}
