export interface Person { id: number; fullName: string }

export interface RunnerMovement {
  start: string | null
  end: string | null
  outBase: string | null
  isOut: boolean
  outNumber?: number
}

export interface Runner {
  movement: RunnerMovement
  details: { runner: Person; isScoringEvent: boolean; event: string; eventType: string; description?: string; playIndex?: number }
  credits: { position: { code: string }; credit: string }[]
}

export interface PlayEvent {
  type: string
  index?: number
  isPitch?: boolean
  isSubstitution?: boolean
  isBaseRunningPlay?: boolean
  player?: { id: number }
  position?: { abbreviation: string }
  details?: { description: string; eventType: string }
  hitData?: { trajectory?: string }
}

export interface Play {
  result: { event: string; eventType: string; description?: string; rbi: number; isOut: boolean }
  about: { inning: number; halfInning: string }
  matchup: {
    batter: Person
    postOnFirst?: Person | null
    postOnSecond?: Person | null
    postOnThird?: Person | null
  }
  runners: Runner[]
  playEvents?: PlayEvent[]
  atBatIndex: number
}

export interface PlayerStats {
  person: Person
  position: { abbreviation: string }
  allPositions?: { abbreviation: string }[]
  battingOrder?: string
  stats: {
    batting: { atBats?: number; runs?: number; hits?: number; rbi?: number; baseOnBalls?: number; strikeOuts?: number }
    pitching: { note?: string; inningsPitched?: string; hits?: number; runs?: number; earnedRuns?: number; baseOnBalls?: number; strikeOuts?: number }
  }
}

export interface TeamBoxscore {
  team: { id: number; name: string }
  batters: number[]
  pitchers: number[]
  battingOrder: number[]
  players: Record<string, PlayerStats>
  teamStats: {
    batting: { atBats: number; runs: number; hits: number; rbi: number; baseOnBalls: number; strikeOuts: number }
  }
}

export interface LinescoreInning {
  num: number
  home: { runs?: number; hits: number; errors: number }
  away: { runs?: number; hits: number; errors: number }
}

export interface CurrentPlay {
  about: { inning: number; halfInning: string; isComplete: boolean }
  matchup: {
    batter: Person
    postOnFirst?: Person | null
    postOnSecond?: Person | null
    postOnThird?: Person | null
  }
  count: { balls: number; strikes: number; outs: number }
}

export interface GameFeed {
  gameData: {
    teams: { away: { name: string; id: number }; home: { name: string; id: number } }
    status: { abstractGameCode: string; detailedState: string }
  }
  liveData: {
    plays: { allPlays: Play[]; currentPlay?: CurrentPlay }
    linescore: {
      currentInning?: number; currentInningOrdinal?: string
      inningState?: string; isTopInning?: boolean
      scheduledInnings: number; innings: LinescoreInning[]
      teams: { home: { runs: number; hits: number; errors: number }; away: { runs: number; hits: number; errors: number } }
      balls?: number; strikes?: number; outs?: number
      defense?: { pitcher?: Person }
      offense?: { batter?: Person }
    }
    boxscore: { teams: { away: TeamBoxscore; home: TeamBoxscore } }
    decisions?: { winner?: Person; loser?: Person; save?: Person }
  }
}

export interface RunnerPath {
  pathBases: string[]
  scored: boolean
  stolenBaseSegment?: [string, string]
  stolenBaseDesc?: string
  outNumber?: number
}
