import type { TeamBoxscore, LinescoreInning, Play, CurrentPlay } from '../types/game'
import {
  getBattingSlots, buildPlayMap, buildLeadoffSet,
  buildSubInfoMap, buildPositionChangeMap,
  getNotation, getBatterOutNumber, traceRunner,
} from '../utils/scorecard'
import Diamond from './Diamond'
import PlayerLinks from './PlayerLinks'

interface Props {
  teamBox: TeamBoxscore
  halfInning: 'top' | 'bottom'
  allPlays: Play[]
  innings: LinescoreInning[]
  currentPlay?: CurrentPlay
  links: Record<string, { b?: string; f?: string }>
}

export default function TeamScorecard({ teamBox, halfInning, allPlays, innings, currentPlay, links }: Props) {
  const slots        = getBattingSlots(teamBox)
  const playMap      = buildPlayMap(allPlays)
  const leadoffs     = buildLeadoffSet(allPlays)
  const subInfo      = buildSubInfoMap(allPlays)
  const posChanges   = buildPositionChangeMap(allPlays)
  const numInnings   = Math.max(9, innings.length)
  const inningNums   = Array.from({ length: numInnings }, (_, i) => i + 1)
  const tb           = teamBox.teamStats.batting
  const side         = halfInning === 'top' ? 'away' : 'home'

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
                <td className="sc-order">{si + 1}</td>

                <td className="sc-pos sc-stacked-cell">
                  {[starter, ...subs].map((player, pi) => {
                    const positions = player.allPositions ?? [player.position]
                    const changes = posChanges.get(player.person.id)
                    return (
                      <div key={player.person.id} className={pi > 0 ? 'sc-sub-pos' : ''}>
                        {positions.map((p, i) => (
                          <span key={i}>
                            {i > 0 && ' → '}
                            {p.abbreviation}
                            {i > 0 && changes?.has(p.abbreviation) && <sup>{changes.get(p.abbreviation)}</sup>}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </td>

                <td className="sc-name sc-stacked-cell">
                  <div className="sc-starter-name">
                    {starter.person.fullName}
                    <PlayerLinks id={starter.person.id} links={links} />
                  </div>
                  {subs.map(sub => {
                    const info = subInfo.get(sub.person.id)
                    return (
                      <div key={sub.person.id} className="sc-sub-name">
                        {sub.person.fullName}
                        {info && <span className="sub-inning" title={info.description}> ({info.inning})</span>}
                        <PlayerLinks id={sub.person.id} links={links} />
                      </div>
                    )
                  })}
                </td>

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
                  const notation  = getNotation(play)
                  const { pathBases, scored, stolenBaseSegment, stolenBaseDesc } = traceRunner(batterId, play.atBatIndex, allPlays)
                  const isLeadoff = leadoffs.has(`${halfInning}-${n}-${batterId}`)
                  const outNumber = getBatterOutNumber(play, batterId)
                  return (
                    <td key={n} className={`sc-inn-cell${isLeadoff ? ' leadoff' : ''}`} title={play.result.description}>
                      <Diamond pathBases={pathBases} scored={scored} notation={notation}
                        outNumber={outNumber} stolenBaseSegment={stolenBaseSegment} stolenBaseDesc={stolenBaseDesc} />
                    </td>
                  )
                })}

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
