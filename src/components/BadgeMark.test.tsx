import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BadgeMark } from './BadgeMark'

function artworkOf(container: HTMLElement) {
  return container.querySelector('img')
}

describe('BadgeMark', () => {
  it('looks the artwork up by badge id, never by name', () => {
    const { container } = render(
      <BadgeMark badgeId="monarch" label="Monarch" unlocked />,
    )

    expect(artworkOf(container)).toHaveAttribute('src', '/badges/monarch.png')
  })

  it('keeps the threshold visible behind a locked silhouette', () => {
    const { container } = render(
      <BadgeMark
        badgeId="ferocious"
        label="Ferocious"
        progress={{ current: 3, target: 4 }}
        unlocked={false}
      />,
    )

    expect(container.firstElementChild).toHaveAttribute(
      'data-unlocked',
      'false',
    )
    expect(artworkOf(container)).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('hands the middle over to the artwork once unlocked', () => {
    render(
      <BadgeMark
        badgeId="ferocious"
        label="Ferocious"
        progress={{ current: 4, target: 4 }}
        unlocked
      />,
    )

    expect(screen.queryByText('4')).toBeNull()
  })

  it('falls back to the threshold when a badge has no artwork yet', () => {
    const { container } = render(
      <BadgeMark
        badgeId="not-illustrated"
        label="Sin ilustración"
        progress={{ current: 1, target: 15 }}
        unlocked
      />,
    )

    fireEvent.error(artworkOf(container)!)

    expect(artworkOf(container)).toBeNull()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('data-artwork', 'false')
  })

  it('asks for the large file in the preview, then steps down twice', () => {
    const { container } = render(
      <BadgeMark badgeId="monarch" label="Monarch" unlocked variant="large" />,
    )

    expect(artworkOf(container)).toHaveAttribute(
      'src',
      '/badges/large/monarch.webp',
    )

    fireEvent.error(artworkOf(container)!)

    expect(artworkOf(container)).toHaveAttribute('src', '/badges/monarch.png')

    fireEvent.error(artworkOf(container)!)

    expect(artworkOf(container)).toBeNull()
  })

  it('names the badge for assistive technology', () => {
    render(
      <BadgeMark badgeId="monarch" label="Monarch, desbloqueada" unlocked />,
    )

    expect(
      screen.getByRole('img', { name: 'Monarch, desbloqueada' }),
    ).toBeInTheDocument()
  })
})
