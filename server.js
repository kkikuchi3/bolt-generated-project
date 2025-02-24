import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

let teams = []
let lapTimes = []  // サーバー側でラップタイムを保持

io.on('connection', (socket) => {
  console.log('Client connected')

  // 接続時に現在のラップタイムを送信
  socket.emit('initialLapTimes', lapTimes)

  socket.on('createTeam', (data) => {
    const team = {
      id: Date.now().toString(),
      name: data.name
    }
    teams.push(team)
    io.emit('teamCreated', team)
  })

  // 新しいラップタイムを受信
  socket.on('recordLap', (lapData) => {
    lapTimes.push(lapData)
    // 全クライアントにブロードキャスト
    io.emit('lapTimeUpdated', lapTimes)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 