// Checks the proof, run inside a clone of the repository:
//   chain.jsonl: every entry's SHA-256 and its link to the previous one; sealed entries (enc) are opened with key.txt
//   once it is published, and key.txt must match key.sha256, committed once before the first sealed entry;
//   plain.jsonl must be the same entries in clear; each entry's first commit must not be older than the entry.
//   node verificar.mjs
import { execFileSync } from 'node:child_process'
import { createDecipheriv, createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const sha = (x) => createHash('sha256').update(x).digest('hex')
const ler = (txt) => txt.split('\n').filter(Boolean)
const falha = (m) => {
  console.log(m)
  process.exit(1)
}
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 })

const chain = ler(readFileSync('chain.jsonl', 'utf8'))
const chave = existsSync('key.txt') ? Buffer.from(readFileSync('key.txt', 'utf8').trim(), 'hex') : null
if (chave && sha(chave) !== readFileSync('key.sha256', 'utf8').trim()) falha('key.txt does not match key.sha256')

let anterior = ''
let selados = 0
const claras = []
for (const [i, l] of chain.entries()) {
  const e = JSON.parse(l)
  if (e.n !== i) falha(`broken at entry ${i}`)
  let linha = l
  if (e.enc) {
    if (!chave) {
      selados++
      anterior = e.hash
      continue
    }
    const b = Buffer.from(e.enc, 'base64')
    const d = createDecipheriv('aes-256-gcm', chave, b.subarray(0, 12)).setAAD(Buffer.from(`${e.n} ${e.hash}`))
    d.setAuthTag(b.subarray(b.length - 16))
    try {
      linha = Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8')
    } catch {
      falha(`sealed entry ${i} does not open with key.txt`)
    }
    const x = JSON.parse(linha)
    if (x.n !== e.n || x.t !== e.t || x.hash !== e.hash) falha(`sealed entry ${i} does not match its envelope`)
  }
  const x = JSON.parse(linha)
  const corpo = JSON.stringify({ n: x.n, t: x.t, tipo: x.tipo, dados: x.dados, anterior: x.anterior })
  if (x.anterior !== anterior || x.hash !== sha(corpo)) falha(`broken at entry ${i}`)
  anterior = x.hash
  claras.push(linha)
}
if (existsSync('plain.jsonl')) {
  const p = ler(readFileSync('plain.jsonl', 'utf8'))
  for (const [i, l] of claras.entries()) if (p[i] !== l) falha(`plain.jsonl differs at entry ${i}`)
}

// commit times: key.sha256 committed once, before the first sealed entry; no entry committed before its own time
let tempos = ''
if (existsSync('.git')) {
  const chaves = ler(git('log', '--format=%cI', '--', 'key.sha256'))
  const primeiroSelado = chain.map((l) => JSON.parse(l)).find((e) => e.enc)
  if (primeiroSelado && (chaves.length !== 1 || Date.parse(chaves[0]) > Date.parse(primeiroSelado.t)))
    falha('key.sha256 was not committed once before the first sealed entry')
  let visto = 0
  let maior = 0
  for (const c of ler(git('log', '--reverse', '--format=%H %cI', '--', 'chain.jsonl'))) {
    const [h, quando] = c.split(' ')
    const linhas = ler(git('show', `${h}:chain.jsonl`))
    for (const [i, l] of linhas.entries()) if (i < chain.length && l !== chain[i]) falha(`entry ${i} was rewritten in commit ${h}`)
    for (; visto < Math.min(linhas.length, chain.length); visto++) {
      const atraso = (Date.parse(quando) - Date.parse(JSON.parse(chain[visto]).t)) / 1000
      if (atraso < -5) falha(`entry ${visto} committed before its time (${h})`)
      maior = Math.max(maior, atraso)
    }
  }
  tempos = `; key committed ${chaves[0] ?? '-'}; slowest entry committed ${Math.round(maior)} s after its time`
}
console.log(`ok: ${chain.length} entries (${selados} sealed), head ${anterior}${tempos}`)
