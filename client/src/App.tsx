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
  currentInningOrdinal?: string
  inningState?: string
  isTopInning?: boolean
  scheduledInnings?: number
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
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function statusLabel(game: Game) {
  const code = game.status.abstractGameCode
  const ls = game.linescore
  if (code === 'F') return 'Final'
  if (code === 'L' && ls?.currentInningOrdinal) {
    return `${ls.inningState} ${ls.currentInningOrdinal}`
  }
  return formatTime(game.gameDate)
}

function Boxscore({ game }: { game: Game }) {
  const ls = game.linescore
  const isLive = game.status.abstractGameCode === 'L'
  const isFinal = game.status.abstractGameCode === 'F'
  const isPreview = game.status.abstractGameCode === 'P'

  const cls = `boxscore${isLive ? ' live' : isFinal ? ' final' : ''}`

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
    </Link>
  )
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
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
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
