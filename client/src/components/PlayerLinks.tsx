const FAVICON = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=16`

interface Props {
  id: number
  links: Record<string, { b?: string; f?: string }>
}

export default function PlayerLinks({ id, links }: Props) {
  const entry = links[String(id)]
  return (
    <>
      <a href={`https://baseballsavant.mlb.com/savant-player/${id}`}
        target="_blank" rel="noreferrer" className="player-link" title="Baseball Savant">
        <img src={FAVICON('baseballsavant.mlb.com')} width="12" height="12" alt="Savant" />
      </a>
      {entry?.f && (
        <a href={`https://www.fangraphs.com/statss.aspx?playerid=${entry.f}`}
          target="_blank" rel="noreferrer" className="player-link" title="FanGraphs">
          <img src={FAVICON('fangraphs.com')} width="12" height="12" alt="FanGraphs" />
        </a>
      )}
      {entry?.b && (
        <a href={`https://www.baseball-reference.com/players/${entry.b[0]}/${entry.b}.shtml`}
          target="_blank" rel="noreferrer" className="player-link" title="Baseball Reference">
          <img src={FAVICON('baseball-reference.com')} width="12" height="12" alt="BBRef" />
        </a>
      )}
    </>
  )
}
