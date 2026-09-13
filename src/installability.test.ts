import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

/**
 * What a phone needs to offer "add to home screen" with a real icon instead
 * of a screenshot: Android reads the manifest, iOS reads the apple-touch-icon
 * and its own meta tags. Both are plain files, so this guards the wiring
 * rather than any behaviour.
 */
describe('installable web app', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    display: string
    icons: { purpose?: string; sizes: string; src: string }[]
    lang: string
    short_name: string
    start_url: string
    theme_color: string
  }

  it('declares a standalone Spanish app named Garroveta', () => {
    expect(manifest.short_name).toBe('Garroveta')
    expect(manifest.lang).toBe('es')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
  })

  it('ships every icon the manifest points to, including a maskable one', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes)

    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(
      true,
    )

    for (const icon of manifest.icons) {
      expect(existsSync(join(root, 'public', icon.src))).toBe(true)
    }
  })

  it('links the manifest, the favicon and the iOS icon from the page', () => {
    const html = read('index.html')

    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(html).toContain(
      `name="theme-color" content="${manifest.theme_color}"`,
    )
    expect(existsSync(join(root, 'public/icons/apple-touch-icon.png'))).toBe(
      true,
    )
  })
})
