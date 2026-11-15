import { spawnSync } from 'node:child_process'
import electron from 'electron'

const resultado = spawnSync(electron, ['scripts/backup.test.mjs'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit'
})
if (resultado.error) console.error(resultado.error)
process.exit(resultado.status ?? 1)
