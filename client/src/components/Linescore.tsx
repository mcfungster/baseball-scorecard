import type { GameFeed, Person } from '../types/game'

interface Decisions { winner?: Person; loser?: Person; save?: Person }


function BaseDiamond({ first, second, third }: { first: boolean; second: boolean; third: boolean }) {
  const on = '#f59e0b'
  const off = 'none'
  const stroke = '#555'
  const size = 9

  return (
    <svg width="44" height="38" viewBox="0 0 44 38">
      {/* 2B - top */}
      <rect x={22 - size / 2} y={1} width={size} height={size} fill={second ? on : off} stroke={stroke} strokeWidth="1.2"
        transform="rotate(45 22 5.5)" />
      {/* 3B - left */}
      <rect x={1} y={19 - size / 2} width={size} height={size} fill={third ? on : off} stroke={stroke} strokeWidth="1.2"
        transform="rotate(45 5.5 19)" />
      {/* 1B - right */}
      <rect x={44 - size - 1} y={19 - size / 2} width={size} height={size} fill={first ? on : off} stroke={stroke} strokeWidth="1.2"
        transform="rotate(45 38.5 19)" />
    </svg>
  )
}

export default function Linescore({ feed, decisions, boxscorePlayers }: {
  feed: GameFeed
  decisions?: Decisions
  boxscorePlayers?: Record<string, { stats: { pitching: { note?: string } } }>
}) {
  const ls = feed.liveData.linescore
  const cols = Array.from({ length: Math.max(ls.scheduledInnings, ls.innings.length) }, (_, i) => i + 1)
  const isLive  = feed.gameData.status.abstractGameCode === 'L'
  const isFinal = feed.gameData.status.abstractGameCode === 'F'
  const runners = isLive && ls.offense ? {
    first:  !!ls.offense.first,
    second: !!ls.offense.second,
    third:  !!ls.offense.third,
  } : null

  return (
    <div className="ls-wrap">
      <div className="ls-row">
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
                    if (isFinal && side === 'home' && inning && inning.home.runs === undefined) {
                      return <td key={n} className="ls-x">×</td>
                    }
                    let cell: string | number = ''
                    if (inning) {
                      const complete = side === 'away' || !ls.isTopInning || (ls.currentInning ?? 0) > n
                      cell = complete ? (inning[side].runs ?? '') : ''
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

        {isLive && runners && (
          <>
          <div className="ls-state">
            <div className="ls-state-inning">{ls.inningState?.replace('Bottom', 'Bot')} {ls.currentInningOrdinal}</div>
            <BaseDiamond first={runners.first} second={runners.second} third={runners.third} />
            <div className="ls-state-row">
              <span className="ls-state-num">{ls.balls ?? 0}–{ls.strikes ?? 0}</span>
              <span className="ls-state-outs">{ls.outs ?? 0} {ls.outs === 1 ? 'out' : 'outs'}</span>
            </div>
          </div>

          <div className="ls-matchup">
            {ls.defense?.pitcher && (
              <div className="ls-matchup-row">
                <span className="ls-matchup-label">P</span>
                {ls.defense.pitcher.fullName}
              </div>
            )}
            {ls.offense?.batter && (
              <div className="ls-matchup-row">
                <span className="ls-matchup-label">AB</span>
                {ls.offense.batter.fullName}
              </div>
            )}
          </div>
          </>
        )}

        {decisions && (
          <div className="ls-decisions">
            {[
              { label: 'WP', person: decisions.winner },
              { label: 'LP', person: decisions.loser },
              { label: 'SV', person: decisions.save },
            ].filter(d => d.person).map(({ label, person }) => {
              const raw  = boxscorePlayers?.[`ID${person!.id}`]?.stats?.pitching?.note
              const note = raw?.replace(/\([WLS], /, '(')
              return (
                <div key={label}>
                  <span className="dec-label">{label}</span>
                  {person!.fullName}
                  {note && <span className="dec-note"> {note}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
