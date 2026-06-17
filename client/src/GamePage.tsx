import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './GamePage.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Person { id: number; fullName: string }

interface RunnerMovement {
  start: string | null
  end: string | null
  outBase: string | null
  isOut: boolean
  outNumber?: number
}

interface Runner {
  movement: RunnerMovement
  details: { runner: Person; isScoringEvent: boolean; event: string; eventType: string; description?: string; playIndex?: number }
  credits: { position: { code: string }; credit: string }[]
}

interface PlayEvent {
  type: string
  index?: number
  isPitch?: boolean
  isSubstitution?: boolean
  isBaseRunningPlay?: boolean
  player?: { id: number }
  details?: { description: string; eventType: string }
  hitData?: { trajectory?: string }
}

interface Play {
  result: { event: string; eventType: string; description?: string; rbi: number; isOut: boolean }
  about: { inning: number; halfInning: string }
  matchup: { batter: Person }
  runners: Runner[]
  playEvents?: PlayEvent[]
  atBatIndex: number
}

interface PlayerStats {
  person: Person
  position: { abbreviation: string }
  allPositions?: { abbreviation: string }[]
  battingOrder?: string
  stats: {
    batting: { atBats?: number; runs?: number; hits?: number; rbi?: number; baseOnBalls?: number; strikeOuts?: number }
    pitching: { note?: string; inningsPitched?: string; hits?: number; runs?: number; earnedRuns?: number; baseOnBalls?: number; strikeOuts?: number }
  }
}

interface TeamBoxscore {
  team: { id: number; name: string }
  batters: number[]
  pitchers: number[]
  battingOrder: number[]
  players: Record<string, PlayerStats>
  teamStats: {
    batting: { atBats: number; runs: number; hits: number; rbi: number; baseOnBalls: number; strikeOuts: number }
  }
}

interface LinescoreInning {
  num: number
  home: { runs: number; hits: number; errors: number }
  away: { runs: number; hits: number; errors: number }
}

interface CurrentPlay {
  about: { inning: number; halfInning: string; isComplete: boolean }
  matchup: { batter: Person }
  count: { balls: number; strikes: number; outs: number }
}

interface GameFeed {
  gameData: {
    teams: { away: { name: string; id: number }; home: { name: string; id: number } }
    status: { abstractGameCode: string; detailedState: string }
  }
  liveData: {
    plays: { allPlays: Play[]; currentPlay?: CurrentPlay }
    linescore: {
      currentInning?: number; currentInningOrdinal?: string
      inningState?: string; isTopInning?: boolean
      scheduledInnings: number; innings: LinescoreInning[]
      teams: { home: { runs: number; hits: number; errors: number }; away: { runs: number; hits: number; errors: number } }
    }
    boxscore: { teams: { away: TeamBoxscore; home: TeamBoxscore } }
  }
}

// ─── Notation helpers ─────────────────────────────────────────────────────────

const BASE_ORDER = ['1B', '2B', '3B', 'score'] as const

function getBasePath(from: string | null, to: string | null): string[] {
  const fromIdx = from === null ? -1 : BASE_ORDER.indexOf(from as typeof BASE_ORDER[number])
  const toIdx   = to   === null ? -1 : BASE_ORDER.indexOf(to   as typeof BASE_ORDER[number])
  if (toIdx < 0 || toIdx <= fromIdx) return []
  return [...BASE_ORDER.slice(fromIdx + 1, toIdx + 1)]
}

function getOutCredits(runners: Runner[], batterId: number, trajectory?: string): string {
  const br = runners.find(r => r.details.runner.id === batterId && r.movement.isOut)
  if (!br) return 'OUT'
  const assists = br.credits.filter(c => c.credit === 'f_assist').map(c => c.position.code)
  const putout  = br.credits.find(c => c.credit === 'f_putout')?.position.code
  if (!putout) return 'OUT'

  if (!trajectory || trajectory === 'ground_ball') {
    return assists.length ? [...assists, putout].join('-') : putout
  }

  const prefix = trajectory === 'popup' ? 'P' : trajectory === 'line_drive' ? 'L' : 'F'
  return assists.length ? `${prefix}${[...assists, putout].join('-')}` : `${prefix}${putout}`
}

function getTrajectory(play: Play): string | undefined {
  const pitches = play.playEvents?.filter(e => e.isPitch) ?? []
  return pitches[pitches.length - 1]?.hitData?.trajectory
}

function getNotation(play: Play): string {
  const { eventType } = play.result
  const id = play.matchup.batter.id
  switch (eventType) {
    case 'walk':            return 'BB'
    case 'intent_walk':     return 'IBB'
    case 'hit_by_pitch':    return 'HBP'
    case 'strikeout': {
      const pitches = play.playEvents?.filter(e => e.isPitch) ?? []
      const last = pitches[pitches.length - 1]
      return last?.details?.description === 'Called Strike' ? 'ꓘ' : 'K'
    }
    case 'single':          return '1B'
    case 'double':          return '2B'
    case 'triple':          return '3B'
    case 'home_run':        return 'HR'
    case 'sac_bunt':        return 'SAC'
    case 'sac_fly':         return 'SF'
    case 'field_error':     return 'E'
    case 'catcher_interf':  return 'CI'
    case 'force_out': {
      const br = play.runners.find(r => r.details.runner.id === id && r.movement.start === null)
      return br && !br.movement.isOut ? 'FC' : getOutCredits(play.runners, id, getTrajectory(play))
    }
    case 'grounded_into_double_play': return 'GDP'
    case 'double_play':     return 'DP'
    case 'field_out':       return getOutCredits(play.runners, id, getTrajectory(play))
    default:                return play.result.event.slice(0, 3).toUpperCase()
  }
}

function getBatterOutNumber(play: Play, batterId: number): number | undefined {
  if (!play.result.isOut) return undefined
  const br = play.runners.find(r => r.details.runner.id === batterId && r.movement.isOut)
  return br?.movement.outNumber
}

// ─── Runner path tracing ──────────────────────────────────────────────────────

interface RunnerPath { pathBases: string[]; scored: boolean; stolenBaseSegment?: [string, string]; stolenBaseDesc?: string }

function traceRunner(batterId: number, atBatIndex: number, allPlays: Play[]): RunnerPath {
  const { inning, halfInning } = allPlays[atBatIndex].about

  const own = allPlays[atBatIndex].runners.find(
    r => r.details.runner.id === batterId && r.movement.start === null
  )

  if (!own || own.movement.isOut) return { pathBases: [], scored: false }

  const initialPath = getBasePath(null, own.movement.end)
  if (own.movement.end === 'score') return { pathBases: initialPath, scored: true }

  const pathBases = [...initialPath]
  let cur = own.movement.end
  let stolenBaseSegment: [string, string] | undefined
  let stolenBaseDesc: string | undefined

  for (let i = atBatIndex + 1; i < allPlays.length; i++) {
    const play = allPlays[i]
    if (play.about.inning !== inning || play.about.halfInning !== halfInning) break

    const entry = play.runners.find(r => r.details.runner.id === batterId)
    if (!entry) continue
    if (entry.movement.isOut) return { pathBases, scored: false, stolenBaseSegment, stolenBaseDesc }

    const next = entry.movement.end
    if (!next) continue

    if (entry.details.eventType.startsWith('stolen_base') && !stolenBaseSegment) {
      stolenBaseSegment = [cur, next]
      const sbEvent = play.playEvents?.find(e => e.index === entry.details.playIndex && e.type === 'action')
      stolenBaseDesc = sbEvent?.details?.description ?? entry.details.event
    }

    pathBases.push(...getBasePath(cur, next))
    cur = next
    if (next === 'score') return { pathBases, scored: true, stolenBaseSegment, stolenBaseDesc }
  }

  return { pathBases, scored: false, stolenBaseSegment, stolenBaseDesc }
}

// ─── Diamond SVG ─────────────────────────────────────────────────────────────

const COORDS: Record<string, [number, number]> = {
  home: [25, 43], '1B': [43, 25], '2B': [25, 7], '3B': [7, 25], score: [25, 43],
}

function Diamond({ pathBases, scored, notation, outNumber, stolenBaseSegment, stolenBaseDesc }: { pathBases: string[]; scored: boolean; notation: string; outNumber?: number; stolenBaseSegment?: [string, string]; stolenBaseDesc?: string }) {
  const path = ['home', ...pathBases]
  const segments: [[number,number],[number,number]][] = []
  for (let i = 0; i < path.length - 1; i++) {
    const from = COORDS[path[i]], to = COORDS[path[i + 1]]
    if (from && to) segments.push([from, to])
  }

  const lineColor   = scored ? '#4ade80' : pathBases.length ? '#aaa' : 'none'
  const textColor   = scored ? '#4ade80' : pathBases.length ? '#ccc' : '#666'
  const diamondFill = scored ? 'rgba(74,222,128,0.12)' : 'none'

  return (
    <svg width="78" height="78" viewBox="0 0 50 50" className="diamond-svg">
      <polygon points="25,7 43,25 25,43 7,25" fill={diamondFill} stroke="#2a2a2a" strokeWidth="1.2" />
      {segments.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <text x="25" y="29" textAnchor="middle" fontSize={notation.length > 3 ? 11 : 15} fill={textColor}
        fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="700">
        {notation}
      </text>
      {stolenBaseSegment && (() => {
        const [from, to] = stolenBaseSegment
        const a = COORDS[from] ?? COORDS['home']
        const b = COORDS[to]   ?? COORDS['score']
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2
        // perpendicular CCW unit vector points outward from diamond center
        const dx = b[0] - a[0], dy = b[1] - a[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        const px = -dy / len, py = dx / len
        const offset = 9
        return (
          <g>
            {stolenBaseDesc && <title>{stolenBaseDesc}</title>}
            <text x={mx + px * offset} y={my + py * offset + 2.5} textAnchor="middle" fontSize="7.5" fill="#a78bfa"
              fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="700">
              SB
            </text>
          </g>
        )
      })()}
      {outNumber && (
        <text x="46" y="46" textAnchor="end" fontSize="9" fill="#666"
          fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="600">
          {outNumber}
        </text>
      )}
    </svg>
  )
}

// ─── Scorecard grid ───────────────────────────────────────────────────────────

function buildPlayMap(allPlays: Play[]) {
  const map = new Map<string, Play>()
  for (const play of allPlays) {
    if (!play.result.eventType) continue  // skip in-progress at-bats
    const key = `${play.about.halfInning}-${play.about.inning}-${play.matchup.batter.id}`
    if (!map.has(key)) map.set(key, play)
  }
  return map
}

function buildSubInfoMap(allPlays: Play[]) {
  const map = new Map<number, { inning: number; description: string }>()
  for (const play of allPlays) {
    for (const event of play.playEvents ?? []) {
      if (event.isSubstitution && event.player?.id && event.details?.description) {
        if (!map.has(event.player.id)) {
          map.set(event.player.id, {
            inning: play.about.inning,
            description: event.details.description,
          })
        }
      }
    }
  }
  return map
}

function buildLeadoffSet(allPlays: Play[]) {
  const seen = new Set<string>()
  const leadoffs = new Set<string>()
  for (const play of allPlays) {
    if (!play.result.eventType) continue
    const { inning, halfInning } = play.about
    const halfKey = `${halfInning}-${inning}`
    if (!seen.has(halfKey)) {
      seen.add(halfKey)
      leadoffs.add(`${halfInning}-${inning}-${play.matchup.batter.id}`)
    }
  }
  return leadoffs
}

function getBattingSlots(teamBox: TeamBoxscore): PlayerStats[][] {
  const slots: PlayerStats[][] = Array.from({ length: 9 }, () => [])
  for (const id of teamBox.batters) {
    const player = teamBox.players[`ID${id}`]
    if (!player?.battingOrder) continue
    const slot = Math.floor(parseInt(player.battingOrder) / 100) - 1
    if (slot >= 0 && slot < 9) slots[slot].push(player)
  }
  slots.forEach(s => s.sort((a, b) => parseInt(a.battingOrder ?? '0') - parseInt(b.battingOrder ?? '0')))
  return slots
}

function TeamScorecard({ teamBox, halfInning, allPlays, innings, currentPlay }: {
  teamBox: TeamBoxscore
  halfInning: 'top' | 'bottom'
  allPlays: Play[]
  innings: LinescoreInning[]
  currentPlay?: CurrentPlay
}) {
  const slots      = getBattingSlots(teamBox)
  const playMap    = buildPlayMap(allPlays)
  const leadoffs   = buildLeadoffSet(allPlays)
  const subInfo    = buildSubInfoMap(allPlays)
  const numInnings = Math.max(9, innings.length)
  const inningNums = Array.from({ length: numInnings }, (_, i) => i + 1)
  const tb         = teamBox.teamStats.batting
  const side       = halfInning === 'top' ? 'away' : 'home'

  return (
    <div className="sc-overflow">
      <table className="sc-table">
        <thead>
          <tr>
            <th className="sc-order">#</th>
            <th className="sc-pos">Pos</th>
            <th className="sc-name">Player</th>
            {inningNums.map(n => <th key={n} className="sc-inn-h">{n}</th>)}
            <th className="sc-stat">AB</th>
            <th className="sc-stat">R</th>
            <th className="sc-stat">H</th>
            <th className="sc-stat">RBI</th>
            <th className="sc-stat">BB</th>
            <th className="sc-stat">K</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, si) => {
            if (!slot.length) return null
            const starter = slot[0]
            const subs    = slot.slice(1)

            return (
              <tr key={si}>
                {/* Order number */}
                <td className="sc-order">{si + 1}</td>

                {/* Pos — stacked */}
                <td className="sc-pos sc-stacked-cell">
                  <div>{(starter.allPositions ?? [starter.position]).map(p => p.abbreviation).join(' → ')}</div>
                  {subs.map(sub => (
                    <div key={sub.person.id} className="sc-sub-pos">
                      {(sub.allPositions ?? [sub.position]).map(p => p.abbreviation).join(' → ')}
                    </div>
                  ))}
                </td>

                {/* Name — stacked */}
                <td className="sc-name sc-stacked-cell">
                  <div className="sc-starter-name">{starter.person.fullName}</div>
                  {subs.map(sub => {
                    const info = subInfo.get(sub.person.id)
                    return (
                      <div key={sub.person.id} className="sc-sub-name">
                        {sub.person.fullName}
                        {info && <span className="sub-inning" title={info.description}> ({info.inning})</span>}
                      </div>
                    )
                  })}
                </td>

                {/* Inning cells — one diamond per inning, for whoever in this slot batted */}
                {inningNums.map(n => {
                  let play: Play | undefined
                  let batterId: number | undefined
                  for (const p of slot) {
                    const found = playMap.get(`${halfInning}-${n}-${p.person.id}`)
                    if (found) { play = found; batterId = p.person.id; break }
                  }

                  const isActive = !play
                    && currentPlay
                    && !currentPlay.about.isComplete
                    && currentPlay.about.halfInning === halfInning
                    && currentPlay.about.inning === n
                    && slot.some(p => p.person.id === currentPlay.matchup.batter.id)

                  if (isActive && currentPlay) {
                    const { balls, strikes } = currentPlay.count
                    return (
                      <td key={n} className="sc-inn-cell sc-inn-active">
                        <svg width="78" height="78" viewBox="0 0 50 50" className="diamond-svg">
                          <polygon points="25,7 43,25 25,43 7,25" fill="rgba(251,191,36,0.1)" stroke="#fbbf24" strokeWidth="1.5" />
                          <text x="25" y="24" textAnchor="middle" fontSize="11" fill="#fbbf24"
                            fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="700">{balls}-{strikes}</text>
                          <text x="25" y="36" textAnchor="middle" fontSize="9" fill="#fbbf24"
                            fontFamily="Helvetica Neue, Arial, sans-serif">AB</text>
                        </svg>
                      </td>
                    )
                  }

                  if (!play || !batterId) return <td key={n} className="sc-inn-cell" />
                  const notation   = getNotation(play)
                  const { pathBases, scored, stolenBaseSegment, stolenBaseDesc } = traceRunner(batterId, play.atBatIndex, allPlays)
                  const isLeadoff  = leadoffs.has(`${halfInning}-${n}-${batterId}`)
                  const outNumber  = getBatterOutNumber(play, batterId)
                  return (
                    <td key={n} className={`sc-inn-cell${isLeadoff ? ' leadoff' : ''}`} title={play.result.description}>
                      <Diamond pathBases={pathBases} scored={scored} notation={notation} outNumber={outNumber} stolenBaseSegment={stolenBaseSegment} stolenBaseDesc={stolenBaseDesc} />
                    </td>
                  )
                })}

                {/* Stats — stacked per player */}
                {(['atBats', 'runs', 'hits', 'rbi', 'baseOnBalls', 'strikeOuts'] as const).map(stat => (
                  <td key={stat} className="sc-stat sc-stacked-cell">
                    <div>{starter.stats.batting[stat] ?? ''}</div>
                    {subs.map(sub => (
                      <div key={sub.person.id} className="sc-sub-stat">{sub.stats.batting[stat] ?? ''}</div>
                    ))}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td className="sc-order" />
            <td className="sc-pos" />
            <td className="sc-name">Totals</td>
            {inningNums.map(n => {
              const inning = innings.find(i => i.num === n)
              return (
                <td key={n} className="sc-inn-cell runs-cell">
                  {inning !== undefined ? inning[side].runs : ''}
                </td>
              )
            })}
            <td className="sc-stat">{tb.atBats}</td>
            <td className="sc-stat">{tb.runs}</td>
            <td className="sc-stat">{tb.hits}</td>
            <td className="sc-stat">{tb.rbi}</td>
            <td className="sc-stat">{tb.baseOnBalls}</td>
            <td className="sc-stat">{tb.strikeOuts}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Pitching table ───────────────────────────────────────────────────────────

function PitchingTable({ teamBox }: { teamBox: TeamBoxscore }) {
  return (
    <table className="pitching-table">
      <thead>
        <tr>
          <th className="pt-name">Pitcher</th>
          <th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th>
        </tr>
      </thead>
      <tbody>
        {teamBox.pitchers.map(id => {
          const p = teamBox.players[`ID${id}`]
          if (!p) return null
          const pt = p.stats.pitching
          return (
            <tr key={id}>
              <td className="pt-name">
                {p.person.fullName}
                {pt.note && <span className="pitcher-note">{pt.note}</span>}
              </td>
              <td>{pt.inningsPitched ?? ''}</td>
              <td>{pt.hits ?? ''}</td>
              <td>{pt.runs ?? ''}</td>
              <td>{pt.earnedRuns ?? ''}</td>
              <td>{pt.baseOnBalls ?? ''}</td>
              <td>{pt.strikeOuts ?? ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Linescore ────────────────────────────────────────────────────────────────

function Linescore({ feed }: { feed: GameFeed }) {
  const ls = feed.liveData.linescore
  const cols = Array.from({ length: Math.max(ls.scheduledInnings, ls.innings.length) }, (_, i) => i + 1)
  const isLive = feed.gameData.status.abstractGameCode === 'L'

  return (
    <div className="ls-wrap">
      <table className="ls-table">
        <thead>
          <tr>
            <th className="ls-team-col" />
            {cols.map(n => <th key={n}>{n}</th>)}
            <th className="ls-sep">R</th><th>H</th><th>E</th>
          </tr>
        </thead>
        <tbody>
          {(['away', 'home'] as const).map(side => {
            const team   = feed.gameData.teams[side]
            const totals = ls.teams[side]
            return (
              <tr key={side}>
                <td className="ls-team-col">
                  <div className="ls-team-inner">
                    <img src={`https://midfield.mlbstatic.com/v1/team/${team.id}/spots/96`} alt="" className="ls-logo" />
                    {team.name}
                  </div>
                </td>
                {cols.map(n => {
                  const inning = ls.innings.find(i => i.num === n)
                  let cell: string | number = ''
                  if (inning) {
                    const complete = side === 'away' || !ls.isTopInning || (ls.currentInning ?? 0) > n
                    cell = complete ? inning[side].runs : ''
                  }
                  return <td key={n}>{cell}</td>
                })}
                <td className="ls-sep ls-total">{totals.runs}</td>
                <td className="ls-total">{totals.hits}</td>
                <td className="ls-total">{totals.errors}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {isLive && <div className="live-badge">{ls.inningState} {ls.currentInningOrdinal}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { gamePk } = useParams<{ gamePk: string }>()
  const [feed, setFeed] = useState<GameFeed | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/game/${gamePk}`)
      .then(r => r.json())
      .then(data => {
        setFeed(data)
        const { away, home } = data.gameData.teams
        document.title = `${away.name} vs ${home.name}`
      })
      .finally(() => setLoading(false))
    return () => { document.title = 'Baseball Scorecard' }
  }, [gamePk])

  if (loading) return <div className="game-page"><p className="page-msg">Loading…</p></div>
  if (!feed)   return <div className="game-page"><p className="page-msg">Game not found.</p></div>

  const { away, home } = feed.liveData.boxscore.teams
  const allPlays    = feed.liveData.plays.allPlays
  const innings     = feed.liveData.linescore.innings
  const ls          = feed.liveData.linescore
  const currentPlay = feed.liveData.plays.currentPlay

  return (
    <div className="game-page">
      <Link to="/" className="back-link">← Scores</Link>

      <div className="game-header">
        <div className="gh-team">
          <img src={`https://midfield.mlbstatic.com/v1/team/${feed.gameData.teams.away.id}/spots/96`} alt="" className="gh-logo" />
          <span>{feed.gameData.teams.away.name}</span>
        </div>
        <div className="gh-score">
          <div className="gh-nums">
            <span>{ls.teams.away.runs}</span>
            <span className="gh-dash">–</span>
            <span>{ls.teams.home.runs}</span>
          </div>
          <div className="gh-status">
            {feed.gameData.status.abstractGameCode === 'F' && ls.currentInning && ls.scheduledInnings && ls.currentInning > ls.scheduledInnings
              ? `Final/${ls.currentInning}`
              : feed.gameData.status.detailedState}
          </div>
        </div>
        <div className="gh-team">
          <img src={`https://midfield.mlbstatic.com/v1/team/${feed.gameData.teams.home.id}/spots/96`} alt="" className="gh-logo" />
          <span>{feed.gameData.teams.home.name}</span>
        </div>
      </div>

      <Linescore feed={feed} />

      {[{ teamBox: away, halfInning: 'top' as const }, { teamBox: home, halfInning: 'bottom' as const }].map(({ teamBox, halfInning }) => (
        <section key={halfInning} className="team-section">
          <h2 className="team-heading">
            <img src={`https://midfield.mlbstatic.com/v1/team/${teamBox.team.id}/spots/96`} alt="" className="th-logo" />
            {teamBox.team.name}
          </h2>
          <TeamScorecard teamBox={teamBox} halfInning={halfInning} allPlays={allPlays} innings={innings} currentPlay={currentPlay} />
          <PitchingTable teamBox={teamBox} />
        </section>
      ))}
    </div>
  )
}
