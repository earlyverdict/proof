// Checks chain.jsonl: every entry's SHA-256 and its link to the previous one.
//   node verificar.mjs [chain.jsonl]
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const linhas = readFileSync(process.argv[2] ?? 'chain.jsonl', 'utf8').split('\n').filter(Boolean)
let anterior = ''
for (const [i, l] of linhas.entries()) {
  const e = JSON.parse(l)
  const corpo = JSON.stringify({ n: e.n, t: e.t, tipo: e.tipo, dados: e.dados, anterior: e.anterior })
  const h = createHash('sha256').update(corpo).digest('hex')
  if (e.n !== i || e.anterior !== anterior || e.hash !== h) { console.log(`broken at entry ${i}`); process.exit(1) }
  anterior = e.hash
}
console.log(`ok: ${linhas.length} entries, head ${anterior}`)
