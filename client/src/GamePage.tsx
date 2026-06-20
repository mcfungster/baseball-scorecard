import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { GameFeed } from './types/game'
import Linescore from './components/Linescore'
import TeamScorecard from './components/TeamScorecard'
import PitchingTable from './components/PitchingTable'
import './GamePage.css'

export default function GamePage() {
  const { gamePk } = useParams<{ gamePk: string }>()
  const [feed, setFeed] = useState<GameFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<Record<string, { b?: string; f?: string }>>({})

  useEffect(() => {
    async function load() {
      try {
        const [data, all]: [GameFeed, Record<string, { b?: string; f?: string }>] =
            await Promise.all(
                [
                  fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`).then(r => r.json()),
                  fetch(`${import.meta.env.BASE_URL}playerLinks.json`).then(r => r.json()),
                ]
            )

        const { away, home } = data.gameData.teams
        document.title = `${away.name} vs ${home.name}`

        const ids = new Set<string>()
        for (const side of [data.liveData.boxscore.teams.away, data.liveData.boxscore.teams.home]) {
          for (const id of [...side.batters, ...side.pitchers]) ids.add(String(id))
        }

        const filtered: Record<string, { b?: string; f?: string }> = {}
        for (const id of ids) if (all[id]) filtered[id] = all[id]

        setFeed(data)
        setLinks(filtered)
      } finally {
        setLoading(false)
      }
    }

    load()
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
            {feed.gameData.status.abstractGameCode === 'F'
              ? (ls.currentInning && ls.scheduledInnings && ls.currentInning > ls.scheduledInnings
                  ? `Final/${ls.currentInning}`
                  : 'Final')
              : feed.gameData.status.abstractGameCode === 'L' && ls.inningState && ls.currentInningOrdinal
                ? `${ls.inningState?.replace('Bottom', 'Bot')} ${ls.currentInningOrdinal}`
                : feed.gameData.status.detailedState}
          </div>
        </div>
        <div className="gh-team">
          <img src={`https://midfield.mlbstatic.com/v1/team/${feed.gameData.teams.home.id}/spots/96`} alt="" className="gh-logo" />
          <span>{feed.gameData.teams.home.name}</span>
        </div>
      </div>

      <Linescore feed={feed} decisions={feed.liveData.decisions} boxscorePlayers={{
        ...feed.liveData.boxscore.teams.away.players,
        ...feed.liveData.boxscore.teams.home.players,
      }} />

      <div className="game-links">
        <a href={`https://baseballsavant.mlb.com/gamefeed?gamePk=${gamePk}`}
          target="_blank" rel="noreferrer" className="game-ext-link">
          <img src="https://www.google.com/s2/favicons?domain=baseballsavant.mlb.com&sz=14" width="12" height="12" alt="" />
          Baseball Savant Gamefeed
        </a>
        <a href={`https://www.mlb.com/gameday/${gamePk}`}
          target="_blank" rel="noreferrer" className="game-ext-link">
          <img src="https://www.google.com/s2/favicons?domain=mlb.com&sz=14" width="12" height="12" alt="" />
          MLB.com Gameday
        </a>
      </div>

      {[{ teamBox: away, halfInning: 'top' as const }, { teamBox: home, halfInning: 'bottom' as const }].map(({ teamBox, halfInning }) => (
        <section key={halfInning} className="team-section">
          <h2 className="team-heading">
            <img src={`https://midfield.mlbstatic.com/v1/team/${teamBox.team.id}/spots/96`} alt="" className="th-logo" />
            {teamBox.team.name}
          </h2>
          <TeamScorecard teamBox={teamBox} halfInning={halfInning} allPlays={allPlays} innings={innings} currentPlay={currentPlay} links={links} />
          <PitchingTable teamBox={teamBox} />
        </section>
      ))}
    </div>
  )
}
