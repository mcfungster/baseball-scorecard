import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const path = join(__dirname, '../client/public/playerLinks.json')

const season = new Date().getFullYear()
const res = await fetch(`https://statsapi.mlb.com/api/v1/sports/1/players?season=${season}`)
const { people } = await res.json()
const activeIds = new Set(people.map(p => String(p.id)))

const existing = JSON.parse(readFileSync(path, 'utf8'))
const all = existing.players ?? existing  // handle old flat format

const filtered = Object.fromEntries(
  Object.entries(all).filter(([id]) => activeIds.has(id))
)

writeFileSync(path, JSON.stringify({ lastUpdated: new Date().toISOString(), players: filtered }))

console.log(`${Object.keys(all).length} → ${Object.keys(filtered).length} entries`)
