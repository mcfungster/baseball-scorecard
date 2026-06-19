import type { TeamBoxscore } from '../types/game'

export default function PitchingTable({ teamBox }: { teamBox: TeamBoxscore }) {
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
