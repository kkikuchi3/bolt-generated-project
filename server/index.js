import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))

app.use(express.json())

// チーム一覧取得エンドポイント
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await db.getTeams()
    res.json(teams)
  } catch (error) {
    res.status(500).json({ error: 'チーム一覧の取得に失敗しました' })
  }
})

// 特定チームのラップタイム取得エンドポイント
app.get('/api/teams/:teamId/laptimes', async (req, res) => {
  try {
    const teamId = req.params.teamId
    const lapTimes = await db.getLapTimesByTeam(teamId)
    res.json(lapTimes)
  } catch (error) {
    res.status(500).json({ error: 'ラップタイムの取得に失敗しました' })
  }
})

io.on('connection', (socket) => {
  console.log('New client connected')

  // チーム作成イベント
  socket.on('createTeam', async (teamData) => {
    try {
      await db.addTeam(teamData)
      io.emit('teamCreated', teamData)
    } catch (error) {
      console.error('チーム作成エラー:', error)
    }
  })

  // ラップタイム記録イベント
  socket.on('recordLapTime', async (lapData) => {
    try {
      await db.recordLapTime(lapData)
      io.emit('lapTimeRecorded', lapData)
    } catch (error) {
      console.error('ラップタイム記録エラー:', error)
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected')
  })
})

const PORT = process.env.PORT || 5000
const HOST = '0.0.0.0'

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
})
