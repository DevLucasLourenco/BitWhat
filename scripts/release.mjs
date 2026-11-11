// Publica a versão atual do package.json como Release no GitHub, a partir desta
// máquina (sem GitHub Actions). O app instalado busca atualizações nessa
// Release (electron-updater, provedor github em electron-builder.yml).
//
// Uso:
//   1. npm version patch --no-git-tag-version   (ou minor/major)
//   2. commit + push no master
//   3. npm run release
//
// Token: usa GH_TOKEN do ambiente ou, se ausente, o login do GitHub CLI
// (`gh auth token`). O token só vai para o processo do electron-builder; nunca
// é impresso nem gravado em arquivo.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(path.join(projectDir, 'package.json'), 'utf8'))
const tag = `v${version}`

const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: projectDir, encoding: 'utf8', shell: process.platform === 'win32', ...options }).trim()

const fail = (message) => {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// 1. Código publicado = código no GitHub: árvore limpa, no master, sem commits
//    locais pendentes de push.
if (run('git', ['status', '--porcelain'])) {
  fail('Há alterações não commitadas. Faça commit (e push) antes de publicar.')
}
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== 'master') {
  fail(`Publique a partir do master (branch atual: ${branch}).`)
}
run('git', ['fetch', 'origin', 'master', '--quiet'])
if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/master'])) {
  fail('O master local difere do origin/master. Faça push (ou pull) antes de publicar.')
}

// 2. Versão nova: não sobrescreve uma Release existente.
const existing = spawnSync('gh', ['release', 'view', tag], { cwd: projectDir, shell: process.platform === 'win32', stdio: 'ignore' })
if (existing.status === 0) {
  fail(`A Release ${tag} já existe. Suba a versão (npm version patch --no-git-tag-version) antes.`)
}

// 3. Token do GitHub.
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
if (!token) {
  try {
    token = run('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    fail('Sem token do GitHub: defina GH_TOKEN ou faça login com `gh auth login`.')
  }
}

// 4. Build e publicação (instalador, .blockmap e latest.yml na Release).
console.log(`\n▶ Publicando BitWhat ${tag} nas Releases do GitHub\n`)
const env = { ...process.env, GH_TOKEN: token }
for (const [command, args] of [
  ['npm', ['run', 'build']],
  ['npx', ['electron-builder', '--win', 'nsis', '--publish', 'always']]
]) {
  const result = spawnSync(command, args, { cwd: projectDir, env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    fail(`Falhou: ${command} ${args.join(' ')}`)
  }
}

// 5. Confere os arquivos que o auto-update precisa.
const assets = run('gh', ['release', 'view', tag, '--json', 'assets', '-q', '.assets[].name']).split(/\r?\n/)
const required = ['latest.yml', `BitWhat-${version}-Setup.exe`, `BitWhat-${version}-Setup.exe.blockmap`]
const missing = required.filter((name) => !assets.includes(name))
if (missing.length > 0) {
  fail(`Release ${tag} criada, mas faltam arquivos: ${missing.join(', ')}`)
}
console.log(`\n✔ Release ${tag} publicada com ${required.join(', ')}\n`)
