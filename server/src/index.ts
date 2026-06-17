import express, { Request, Response } from 'express'

const app = express()

app.get('/api/schedule', async (req: Request, res: Response) => {
  const date = req.query.date
  const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=linescore,decisions&date=${date}`)
  const data = await response.json()
  res.json(data)
})

app.get('/api/game/:gamePk', async (req: Request, res: Response) => {
  const { gamePk } = req.params
  const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`)
  const data = await response.json()
  res.json(data)
})

app.listen(3001, () => console.log('Server running on 3001'))
