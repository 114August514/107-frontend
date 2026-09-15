import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = JSON.parse(readFileSync(join(root, 'contracts/source.json'), 'utf8'))
const digest = createHash('sha256')
  .update(readFileSync(join(root, 'contracts/openapi.json')))
  .digest('hex')
if (
  source.working_tree_dirty ||
  !/^[0-9a-f]{40}$/.test(source.commit) ||
  source.sha256 !== digest
) {
  throw new Error('Contract provenance is invalid; import a committed backend contract')
}
const directory = mkdtempSync(join(tmpdir(), '107-api-'))
try {
  const output = join(directory, 'schema.d.ts')
  execFileSync('pnpm', ['exec', 'openapi-typescript', 'contracts/openapi.json', '-o', output], {
    cwd: root,
    stdio: 'inherit',
  })
  if (!readFileSync(output).equals(readFileSync(join(root, 'src/api/schema.d.ts')))) {
    throw new Error('API types drift: run pnpm run generate:api and commit the result')
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
