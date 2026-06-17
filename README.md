# Baseball Scorecard

A live MLB scoreboard and interactive paper scorecard built with React, TypeScript, and the MLB Stats API.

## What it does

**Scoreboard** — Today's games at a glance: scores, game status (live, final, suspended/delayed), W/L/S pitching decisions, and extra-inning indicators. Navigate by day with arrow buttons.

**Scorecard** — A full paper-style scorecard for any game, including:

- Inning-by-inning diamond notation showing base paths and whether the runner scored
- Traditional out notation: groundouts (`6-3`), flyouts (`F8`), popups (`P6`), line drives (`L7`)
- Strikeout (`K`) and called strikeout (`ꓘ`)
- Stolen base (`SB`) positioned over the advancement line on the diamond, with tooltip description
- Out number (1, 2, 3) in the corner of each cell
- 9-slot batting order layout matching traditional paper scorecards, with substitutes stacked in their slot
- Substitution entry inning with tooltip showing the nature of the sub
- Positional changes shown with arrows (`1B → LF`)
- Double-line indicator marking the leadoff batter of each inning
- Current at-bat highlighted with live ball-strike count
- Pitching lines for both teams

## Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Express 5, TypeScript, `tsx`
- **Data**: [MLB Stats API](https://statsapi.mlb.com)

## Running locally

```bash
# Start the API proxy (port 3001)
cd server && npm install && npm run dev

# Start the frontend (port 5173)
cd client && npm install && npm run dev
```

Then open `http://localhost:5173`.
