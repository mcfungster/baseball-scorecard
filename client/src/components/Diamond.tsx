import { COORDS } from '../utils/scorecard'

interface DiamondProps {
  pathBases: string[]
  scored: boolean
  notation: string
  outNumber?: number
  stolenBaseSegment?: [string, string]
  stolenBaseDesc?: string
}

export default function Diamond({ pathBases, scored, notation, outNumber, stolenBaseSegment, stolenBaseDesc }: DiamondProps) {
  const path = ['home', ...pathBases]
  const segments: [[number, number], [number, number]][] = []
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
