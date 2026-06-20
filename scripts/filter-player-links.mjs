import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../client/public/playerLinks.json')

const season = new Date().getFullYear()

console.log('Fetching Chadwick Bureau register...')
const hexChars = '0123456789abcdef'
const csvTexts = await Promise.all(
  hexChars.split('').map(c =>
    fetch(`https://raw.githubusercontent.com/chadwickbureau/register/master/data/people-${c}.csv`)
      .then(r => r.text())
  )
)

const lookup = {}
for (const csv of csvTexts) {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',')
  const mlbIdx   = headers.indexOf('key_mlbam')
  const bbrefIdx = headers.indexOf('key_bbref')
  const fgIdx    = headers.indexOf('key_fangraphs')
  for (let i = 1; i < lines.length; i++) {
    const cols  = lines[i].split(',')
    const mlb   = cols[mlbIdx]?.trim()
    const bbref = cols[bbrefIdx]?.trim()
    const fg    = cols[fgIdx]?.trim()
    if (mlb && (bbref || fg)) {
      const entry = {}
      if (bbref) entry.b = bbref
      if (fg)    entry.f = fg
      lookup[mlb] = entry
    }
  }
}

console.log(`Fetching active MLB roster for ${season}...`)
const { people } = await fetch(`https://statsapi.mlb.com/api/v1/sports/1/players?season=${season}`).then(r => r.json())
const activeIds = new Set(people.map(p => String(p.id)))

const filtered = Object.fromEntries(Object.entries(lookup).filter(([id]) => activeIds.has(id)))

writeFileSync(outPath, JSON.stringify(filtered, null, 0))
console.log(`Written ${Object.keys(filtered).length} entries to ${outPath}`)
