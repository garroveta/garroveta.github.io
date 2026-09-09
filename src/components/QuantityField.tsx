import { useState } from 'react'

type QuantityFieldProps = {
  ariaLabel: string
  disabled?: boolean
  max?: number
  min?: number
  required?: boolean
  value: number
  onChange: (quantity: number) => void
}

/**
 * A number input that can be emptied while typing. A plain controlled input
 * turns `Number('')` into `0`, so clearing the field left a zero stuck in front
 * of whatever came next. What is typed stays visible until it is valid, and the
 * field falls back to the last valid value when it loses focus.
 */
export function QuantityField({
  ariaLabel,
  disabled,
  max,
  min = 1,
  required,
  value,
  onChange,
}: QuantityFieldProps) {
  const [draft, setDraft] = useState<string>()

  const handleChange = (raw: string) => {
    const parsed = Number(raw)

    if (raw !== '' && Number.isInteger(parsed) && parsed >= min) {
      setDraft(undefined)
      onChange(parsed)
      return
    }

    setDraft(raw)
  }

  return (
    <input
      aria-label={ariaLabel}
      disabled={disabled}
      max={max}
      min={min}
      required={required}
      type="number"
      value={draft ?? value}
      onBlur={() => setDraft(undefined)}
      onChange={(event) => handleChange(event.target.value)}
    />
  )
}
