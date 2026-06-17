import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  innings?: LinescoreInning[]
  teams?: {
    home: { runs: number; hits: number; errors: number }
    away: { runs: number; hits: number; errors: number }
  }
  outs?: number
}

interface TeamInfo {
  team: { id: number; name: string }
  leagueRecord: { wins: number; losses: number }
  score?: number
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

function Boxscore({ game }: { game: Game }) {
  const ls = game.linescore
  const isLive = game.status.abstractGameCode === 'L' && !isInterrupted(game)
  const isFinal = game.status.abstractGameCode === 'F'
  const isPreview = game.status.abstractGameCode === 'P'
  const interrupted = isInterrupted(game)

  const cls = `boxscore${isLive ? ' live' : isFinal ? ' final' : interrupted ? ' interrupted' : ''}`

  return (
    <Link to={`/game/${game.gamePk}`} className={cls}>
      <div className="status">{statusLabel(game)}</div>
      <table>
        <thead>
          <tr>
            <th className="team-col" />
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
                  <img
                    src={`https://midfield.mlbstatic.com/v1/team/${team.team.id}/spots/96`}
                    alt={team.team.name}
                    className="team-logo"
                  />
                  <span className="team-name">{team.team.name}</span>
                  <span className="record">{team.leagueRecord.wins}–{team.leagueRecord.losses}</span>
                </td>
                <td className="total">{isPreview ? '' : (totals?.runs ?? team.score ?? '')}</td>
                <td className="total">{isPreview ? '' : (totals?.hits ?? '')}</td>
                <td className="total">{isPreview ? '' : (totals?.errors ?? '')}</td>
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
      </div>
    </Link>
  )
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

export default function App() {
  const today = new Date().toLocaleDateString('en-CA')
  const [date, setDate] = useState(today)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/schedule?date=${date}`)
      .then(r => r.json())
      .then(data => setGames(data.dates?.[0]?.games ?? []))
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
          {games.map(game => <Boxscore key={game.gamePk} game={game} />)}
        </div>
      </main>
    </div>
  )
}
