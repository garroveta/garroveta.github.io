import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { QuantityField } from './QuantityField'

function ControlledField({
  initial = 3,
  min,
  onChange = vi.fn(),
}: {
  initial?: number
  min?: number
  onChange?: (quantity: number) => void
}) {
  const [value, setValue] = useState(initial)

  return (
    <QuantityField
      ariaLabel="Cantidad"
      min={min}
      value={value}
      onChange={(quantity) => {
        setValue(quantity)
        onChange(quantity)
      }}
    />
  )
}

describe('QuantityField', () => {
  it('can be emptied without leaving a zero behind', () => {
    const onChange = vi.fn()
    render(<ControlledField onChange={onChange} />)

    const field = screen.getByLabelText('Cantidad')

    fireEvent.change(field, { target: { value: '' } })

    expect(field).toHaveValue(null)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: '5' } })

    expect(field).toHaveValue(5)
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('never reports a quantity below the minimum', () => {
    const onChange = vi.fn()
    render(<ControlledField onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Cantidad'), {
      target: { value: '0' },
    })

    expect(onChange).not.toHaveBeenCalled()
    // what was typed stays visible instead of being swallowed
    expect(screen.getByLabelText('Cantidad')).toHaveValue(0)
  })

  it('falls back to the last valid quantity when it loses focus', () => {
    render(<ControlledField initial={4} />)

    const field = screen.getByLabelText('Cantidad')

    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    expect(field).toHaveValue(4)
  })

  it('honours a minimum above one', () => {
    const onChange = vi.fn()
    render(<ControlledField initial={5} min={3} onChange={onChange} />)

    const field = screen.getByLabelText('Cantidad')

    fireEvent.change(field, { target: { value: '2' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: '3' } })
    expect(onChange).toHaveBeenCalledWith(3)
  })
})
