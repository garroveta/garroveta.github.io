const SIZE = 44
const RADIUS = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type BadgeMarkProps = {
  label: string
  glyph?: string
  progress?: { current: number; target: number }
  unlocked: boolean
}

/**
 * A badge is drawn rather than illustrated: the threshold sits in the middle
 * and the ring around it is how far the member is, so a locked badge always
 * shows its distance without a separate bar.
 */
export function BadgeMark({
  label,
  glyph,
  progress,
  unlocked,
}: BadgeMarkProps) {
  const ratio =
    unlocked || !progress
      ? 1
      : Math.min(1, Math.max(0, progress.current / progress.target))

  return (
    <svg
      className="badge-mark"
      data-unlocked={unlocked}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={label}
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
      <text
        className="badge-mark__value"
        x={SIZE / 2}
        y={SIZE / 2}
        dominantBaseline="central"
        textAnchor="middle"
      >
        {glyph ?? progress?.target ?? ''}
      </text>
    </svg>
  )
}
