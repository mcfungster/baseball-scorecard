import type { GameFeed } from '../types/game'

export default function Linescore({ feed }: { feed: GameFeed }) {
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
