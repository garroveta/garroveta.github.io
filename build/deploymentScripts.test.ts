import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

type PackageManifest = {
  scripts?: Record<string, string>
}

describe('Worker deployment scripts', () => {
  it('always validates and rebuilds the Worker before Wrangler runs', async () => {
    const packageManifest = JSON.parse(
      await readFile('package.json', 'utf8'),
    ) as PackageManifest

    expect(packageManifest.scripts).toMatchObject({
      'deploy:worker': 'npm run check && npm run build && wrangler deploy',
      'deploy:worker:dry-run':
        'npm run check && npm run build && wrangler deploy --dry-run',
    })
  })
})
