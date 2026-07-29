import { access, copyFile, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const distDirectory = resolve(root, 'dist')
const entries = await readdir(distDirectory, { withFileTypes: true })
let workerEntry

for (const entry of entries) {
  if (
    !entry.isDirectory() ||
    entry.name === 'client' ||
    entry.name === 'server' ||
    entry.name.startsWith('.')
  ) {
    continue
  }

  const candidate = resolve(distDirectory, entry.name, 'index.js')

  try {
    await access(candidate)
    workerEntry = candidate
    break
  } catch {
    // Continue until the Cloudflare worker output is found.
  }
}

if (!workerEntry) {
  throw new Error('Cloudflare worker output was not found in dist.')
}

const serverDirectory = resolve(distDirectory, 'server')
await mkdir(serverDirectory, { recursive: true })
await copyFile(workerEntry, resolve(serverDirectory, 'index.js'))
