import type { Play, Runner, PlayerStats, TeamBoxscore, RunnerPath } from '../types/game'

export const BASE_ORDER = ['1B', '2B', '3B', 'score'] as const

export const COORDS: Record<string, [number, number]> = {
  home: [25, 43], '1B': [43, 25], '2B': [25, 7], '3B': [7, 25], score: [25, 43],
}

export function getBasePath(from: string | null, to: string | null): string[] {
  const fromIdx = from === null ? -1 : BASE_ORDER.indexOf(from as typeof BASE_ORDER[number])
  const toIdx   = to   === null ? -1 : BASE_ORDER.indexOf(to   as typeof BASE_ORDER[number])
  if (toIdx < 0 || toIdx <= fromIdx) return []
  return [...BASE_ORDER.slice(fromIdx + 1, toIdx + 1)]
}

function getOutCredits(runners: Runner[], batterId: number, trajectory?: string): string {
  const br = runners.find(r => r.details.runner.id === batterId && r.movement.isOut)
  if (!br) return 'OUT'
  const assists = br.credits.filter(c => c.credit === 'f_assist').map(c => c.position.code)
  const putout  = br.credits.find(c => c.credit === 'f_putout')?.position.code
  if (!putout) return 'OUT'
  if (!trajectory || trajectory === 'ground_ball') {
    return assists.length ? [...assists, putout].join('-') : putout
  }
  const prefix = trajectory === 'popup' ? 'P' : trajectory === 'line_drive' ? 'L' : 'F'
  return assists.length ? `${prefix}${[...assists, putout].join('-')}` : `${prefix}${putout}`
}

function getTrajectory(play: Play): string | undefined {
  const pitches = play.playEvents?.filter(e => e.isPitch) ?? []
  return pitches[pitches.length - 1]?.hitData?.trajectory
}

export function getNotation(play: Play): string {
  const { eventType } = play.result
  const id = play.matchup.batter.id
  switch (eventType) {
    case 'walk':            return 'BB'
    case 'intent_walk':     return 'IBB'
    case 'hit_by_pitch':    return 'HBP'
    case 'strikeout': {
      const pitches = play.playEvents?.filter(e => e.isPitch) ?? []
      const last = pitches[pitches.length - 1]
      return last?.details?.description === 'Called Strike' ? 'ꓘ' : 'K'
    }
    case 'single':          return '1B'
    case 'double':          return '2B'
    case 'triple':          return '3B'
    case 'home_run':        return 'HR'
    case 'sac_bunt':        return 'SAC'
    case 'sac_fly':         return 'SF'
    case 'field_error':     return 'E'
    case 'catcher_interf':  return 'CI'
    case 'force_out': {
      const br = play.runners.find(r => r.details.runner.id === id && r.movement.start === null)
      return br && !br.movement.isOut ? 'FC' : getOutCredits(play.runners, id, getTrajectory(play))
    }
    case 'grounded_into_double_play': return 'GDP'
    case 'double_play':     return 'DP'
    case 'field_out':       return getOutCredits(play.runners, id, getTrajectory(play))
    default:                return play.result.event.slice(0, 3).toUpperCase()
  }
}

export function getBatterOutNumber(play: Play, batterId: number): number | undefined {
  if (!play.result.isOut) return undefined
  const br = play.runners.find(r => r.details.runner.id === batterId && r.movement.isOut)
  return br?.movement.outNumber
}

export function traceRunner(batterId: number, atBatIndex: number, allPlays: Play[]): RunnerPath {
  const { inning, halfInning } = allPlays[atBatIndex].about
  const own = allPlays[atBatIndex].runners.find(
    r => r.details.runner.id === batterId && r.movement.start === null
  )
  if (!own || own.movement.isOut) return { pathBases: [], scored: false }

  const initialPath = getBasePath(null, own.movement.end)
  if (own.movement.end === 'score') return { pathBases: initialPath, scored: true }

  const pathBases = [...initialPath]
  let cur = own.movement.end
  let stolenBaseSegment: [string, string] | undefined
  let stolenBaseDesc: string | undefined

  for (let i = atBatIndex + 1; i < allPlays.length; i++) {
    const play = allPlays[i]
    if (play.about.inning !== inning || play.about.halfInning !== halfInning) break
    const entry = play.runners.find(r => r.details.runner.id === batterId)
    if (!entry) continue
    if (entry.movement.isOut) return { pathBases, scored: false, stolenBaseSegment, stolenBaseDesc }
    const next = entry.movement.end
    if (!next) continue
    if (entry.details.eventType.startsWith('stolen_base') && !stolenBaseSegment) {
      stolenBaseSegment = [cur, next]
      const sbEvent = play.playEvents?.find(e => e.index === entry.details.playIndex && e.type === 'action')
      stolenBaseDesc = sbEvent?.details?.description ?? entry.details.event
    }
    pathBases.push(...getBasePath(cur, next))
    cur = next
    if (next === 'score') return { pathBases, scored: true, stolenBaseSegment, stolenBaseDesc }
  }
  return { pathBases, scored: false, stolenBaseSegment, stolenBaseDesc }
}

export function buildPlayMap(allPlays: Play[]) {
  const map = new Map<string, Play>()
  for (const play of allPlays) {
    if (!play.result.eventType) continue
    const key = `${play.about.halfInning}-${play.about.inning}-${play.matchup.batter.id}`
    if (!map.has(key)) map.set(key, play)
  }
  return map
}

export function buildSubInfoMap(allPlays: Play[]) {
  const map = new Map<number, { inning: number; description: string }>()
  for (const play of allPlays) {
    for (const event of play.playEvents ?? []) {
      if (event.isSubstitution && event.player?.id && event.details?.description) {
        if (!map.has(event.player.id)) {
          map.set(event.player.id, { inning: play.about.inning, description: event.details.description })
        }
      }
    }
  }
  return map
}

export function buildPositionChangeMap(allPlays: Play[]) {
  const map = new Map<number, Map<string, number>>()
  for (const play of allPlays) {
    for (const event of play.playEvents ?? []) {
      if (event.details?.eventType === 'defensive_switch' && event.player?.id && event.position?.abbreviation) {
        if (!map.has(event.player.id)) map.set(event.player.id, new Map())
        map.get(event.player.id)!.set(event.position.abbreviation, play.about.inning)
      }
    }
  }
  return map
}

export function buildLeadoffSet(allPlays: Play[]) {
  const seen = new Set<string>()
  const leadoffs = new Set<string>()
  for (const play of allPlays) {
    if (!play.result.eventType) continue
    const { inning, halfInning } = play.about
    const halfKey = `${halfInning}-${inning}`
    if (!seen.has(halfKey)) {
      seen.add(halfKey)
      leadoffs.add(`${halfInning}-${inning}-${play.matchup.batter.id}`)
    }
  }
  return leadoffs
}

export function getBattingSlots(teamBox: TeamBoxscore): PlayerStats[][] {
  const slots: PlayerStats[][] = Array.from({ length: 9 }, () => [])
  for (const id of teamBox.batters) {
    const player = teamBox.players[`ID${id}`]
    if (!player?.battingOrder) continue
    const slot = Math.floor(parseInt(player.battingOrder) / 100) - 1
    if (slot >= 0 && slot < 9) slots[slot].push(player)
  }
  slots.forEach(s => s.sort((a, b) => parseInt(a.battingOrder ?? '0') - parseInt(b.battingOrder ?? '0')))
  return slots
}
