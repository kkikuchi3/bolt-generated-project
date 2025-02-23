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

io.on('connection', (socket) => {
  console.log('Client connected')

  socket.on('createTeam', (data) => {
    const team = {
      id: Date.now().toString(),
      name: data.name
    }
    teams.push(team)
    io.emit('teamCreated', team)
  })

  socket.on('recordLapTime', (data) => {
    io.emit('lapTimeRecorded', data)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 