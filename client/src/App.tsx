import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './App.css'

interface LinescoreInning {
  num: number
  home: { runs: number; hits: number; errors: number }
  away: { runs: number; hits: number; errors: number }
}

interface Linescore {
  currentInning?: number
  scheduledInnings?: number
  currentInningOrdinal?: string
  inningState?: string
  isTopInning?: boolean
  defense?: { pitcher?: { fullName: string } }
  offense?: { batter?: { fullName: string } }
  innings?: LinescoreInning[]
  teams?: {
    home: { runs: number; hits: number; errors: number }
    away: { runs: number; hits: number; errors: number }
  }
  outs?: number
}

interface PitcherInfo {
  hand: string
  wins: number
  losses: number
  era: string
}

interface TeamInfo {
  team: { id: number; name: string }
  leagueRecord: { wins: number; losses: number }
  score?: number
  probablePitcher?: { id: number; fullName: string }
}

interface Game {
  gamePk: number
  gameDate: string
  status: {
    abstractGameCode: string
    detailedState: string
  }
  teams: { away: TeamInfo; home: TeamInfo }
  linescore?: Linescore
  decisions?: {
    winner?: { fullName: string }
    loser?: { fullName: string }
    save?: { fullName: string }
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

const INTERRUPTED = ['Delayed', 'Delayed Start', 'Suspended', 'Postponed']

function isInterrupted(game: Game) {
  return INTERRUPTED.some(s => game.status.detailedState.startsWith(s))
}

function statusLabel(game: Game) {
  const { abstractGameCode, detailedState } = game.status
  const ls = game.linescore
  if (abstractGameCode === 'F') {
    const inn = ls?.currentInning ?? 0
    const sched = ls?.scheduledInnings ?? 9
    return inn > sched ? `Final/${inn}` : 'Final'
  }
  if (abstractGameCode === 'L') {
    if (isInterrupted({ status: { abstractGameCode, detailedState } } as Game)) {
      return ls?.currentInningOrdinal
        ? `${detailedState} – ${ls.inningState} ${ls.currentInningOrdinal}`
        : detailedState
    }
    if (ls?.currentInningOrdinal) return `${ls.inningState} ${ls.currentInningOrdinal}`
  }
  return detailedState !== 'Scheduled' && detailedState !== 'Preview'
    ? detailedState
    : formatTime(game.gameDate)
}

function Boxscore({ game, pitcherInfo }: { game: Game; pitcherInfo: Record<number, PitcherInfo> }) {
  const ls = game.linescore
  const isLive = game.status.abstractGameCode === 'L' && !isInterrupted(game)
  const isFinal = game.status.abstractGameCode === 'F'
  const isPreview = game.status.abstractGameCode === 'P'
  const interrupted = isInterrupted(game)

  const cls = `boxscore${isLive ? ' live' : isFinal ? ' final' : interrupted ? ' interrupted' : isPreview ? ' preview' : ''}`

  const body = isPreview ? (
    <>
      <div className="status">{statusLabel(game)}</div>
      <div className="preview-teams">
        {(['away', 'home'] as const).map(side => {
          const team = game.teams[side]
          return (
            <div key={side} className="preview-team">
              <img src={`https://midfield.mlbstatic.com/v1/team/${team.team.id}/spots/96`} alt={team.team.name} className="team-logo" />
              <span className="team-name">{team.team.name}</span>
              <span className="record">{team.leagueRecord.wins}–{team.leagueRecord.losses}</span>
              {team.probablePitcher && (() => {
                const info = pitcherInfo[team.probablePitcher.id]
                return (
                  <span className="probable-pitcher">
                    <span>{team.probablePitcher.fullName}{info && ` (${info.hand})`}</span>
                    {info && <span className="pitcher-stats">{info.wins}-{info.losses}, {info.era} ERA</span>}
                  </span>
                )
              })()}
            </div>
          )
        })}
      </div>
      <div className="preview-spacer" />
    </>
  ) : (
    <>
      <table>
        <thead>
          <tr>
            <th className="team-col status">{statusLabel(game)}</th>
            <th>R</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          {(['away', 'home'] as const).map(side => {
            const team = game.teams[side]
            const totals = ls?.teams?.[side]
            return (
              <tr key={side}>
                <td className="team-col">
                  <img src={`https://midfield.mlbstatic.com/v1/team/${team.team.id}/spots/96`} alt={team.team.name} className="team-logo" />
                  <span className="team-name">{team.team.name}</span>
                  <span className="record">{team.leagueRecord.wins}–{team.leagueRecord.losses}</span>
                </td>
                <td className="total">{totals?.runs ?? team.score ?? ''}</td>
                <td className="total">{totals?.hits ?? ''}</td>
                <td className="total">{totals?.errors ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="decisions">
        {isFinal && game.decisions && <>
          {game.decisions.winner && <span><span className="dec-label">W</span> {game.decisions.winner.fullName}</span>}
          {game.decisions.loser  && <span><span className="dec-label">L</span> {game.decisions.loser.fullName}</span>}
          {game.decisions.save   && <span><span className="dec-label">S</span> {game.decisions.save.fullName}</span>}
        </>}
        {isLive && <>
          {ls?.defense?.pitcher && <span><span className="dec-label">P</span> {ls.defense.pitcher.fullName}</span>}
          {ls?.offense?.batter  && <span><span className="dec-label">AB</span> {ls.offense.batter.fullName}</span>}
        </>}
      </div>
    </>
  )

  return isPreview
    ? <div className={cls}>{body}</div>
    : <Link to={`/game/${game.gamePk}`} className={cls}>{body}</Link>
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

export default function App() {
  const today = new Date().toLocaleDateString('en-CA')
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? today
  const setDate = (d: string | ((prev: string) => string)) => {
    const next = typeof d === 'function' ? d(date) : d
    setSearchParams(next === today ? {} : { date: next })
  }
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [pitcherInfo, setPitcherInfo] = useState<Record<number, PitcherInfo>>({})

  useEffect(() => {
    setLoading(true)
    setPitcherInfo({})
    fetch(`/api/schedule?date=${date}`)
      .then(r => r.json())
      .then(data => {
        const games: Game[] = data.dates?.[0]?.games ?? []
        setGames(games)

        const ids = new Set<number>()
        for (const g of games) {
          if (g.teams.away.probablePitcher?.id) ids.add(g.teams.away.probablePitcher.id)
          if (g.teams.home.probablePitcher?.id) ids.add(g.teams.home.probablePitcher.id)
        }
        if (!ids.size) return

        fetch(`https://statsapi.mlb.com/api/v1/people?personIds=${[...ids].join(',')}&hydrate=stats(group=pitching,type=season),pitchHand`)
          .then(r => r.json())
          .then(d => {
            const info: Record<number, PitcherInfo> = {}
            for (const p of d.people ?? []) {
              const stat = p.stats?.[0]?.splits?.[0]?.stat ?? {}
              info[p.id] = {
                hand: p.pitchHand?.code ?? '?',
                wins: stat.wins ?? 0,
                losses: stat.losses ?? 0,
                era: stat.era ?? '-',
              }
            }
            setPitcherInfo(info)
          })
      })
      .finally(() => setLoading(false))
  }, [date])

  return (
    <div className="app">
      <header>
        <h1>MLB Scores</h1>
        <div className="date-nav">
          <button onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => setDate(d => shiftDate(d, 1))}>›</button>
        </div>
        {date !== today && (
          <button className="today-btn" onClick={() => setDate(today)}>Today</button>
        )}
      </header>
      <main>
        {loading && <p className="msg">Loading...</p>}
        {!loading && games.length === 0 && <p className="msg">No games scheduled.</p>}
        <div className="grid">
          {games.map(game => <Boxscore key={game.gamePk} game={game} pitcherInfo={pitcherInfo} />)}
        </div>
      </main>
    </div>
  )
}
