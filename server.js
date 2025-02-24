import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// MySQL接続プールの作成
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// テーブル作成のSQL
const createTablesSQL = `
  DROP TABLE IF EXISTS lap_times;
  CREATE TABLE lap_times (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    number INT NOT NULL,
    total_time BIGINT NOT NULL,
    timestamp VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`

// テーブルの初期化を確実に行う
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection()
    await connection.query(createTablesSQL)
    console.log('Database tables initialized')
    connection.release()
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// 必ず初期化を実行
await initializeDatabase()

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // 開発時のみ。本番環境では適切なオリジンを指定
    methods: ["GET", "POST"]
  }
})

// グローバルなタイマー状態
let globalTimerState = {
  time: 0,
  isRunning: false
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // 接続時に保存されているラップタイムを送信
  async function sendInitialData() {
    try {
      const [rows] = await pool.query('SELECT * FROM lap_times ORDER BY number ASC')
      console.log(`Sending initial data to ${socket.id}:`, rows)
      socket.emit('liveResultsUpdated', rows)
    } catch (error) {
      console.error('Error fetching initial lap times:', error)
    }
  }
  
  sendInitialData()

  // ラップタイム記録
  socket.on('recordLap', async (lapData) => {
    try {
      console.log(`Recording new lap from ${socket.id}:`, lapData)

      // データベースに保存
      const [result] = await pool.query(
        `INSERT INTO lap_times (number, total_time, timestamp) 
         VALUES (?, ?, ?)`,
        [lapData.number, lapData.total_time, lapData.timestamp]
      )

      // 全データを取得して全クライアントに送信
      const [updatedLaps] = await pool.query('SELECT * FROM lap_times ORDER BY number ASC')
      console.log(`Broadcasting updated laps to all clients (${updatedLaps.length} records):`, updatedLaps)
      io.emit('liveResultsUpdated', updatedLaps)
    } catch (error) {
      console.error('Error recording lap:', error)
    }
  })

  // リアルタイム結果の取得リクエスト
  socket.on('getLiveResults', async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM lap_times ORDER BY number ASC')
      console.log(`Sending requested live results to ${socket.id} (${rows.length} records):`, rows)
      socket.emit('liveResultsUpdated', rows)
    } catch (error) {
      console.error('Error fetching live results:', error)
    }
  })

  // リセット処理
  socket.on('resetTimer', async () => {
    try {
      console.log('Resetting timer and clearing all records')
      await pool.query('TRUNCATE TABLE lap_times')
      io.emit('liveResultsUpdated', [])
    } catch (error) {
      console.error('Error resetting timer:', error)
    }
  })

  // チーム作成
  socket.on('createTeam', async (data) => {
    try {
      const teamId = Date.now().toString()
      await pool.query(
        'INSERT INTO teams (id, name) VALUES (?, ?)',
        [teamId, data.name]
      )
      const team = { id: teamId, name: data.name }
      io.emit('teamCreated', team)
    } catch (error) {
      console.error('Error creating team:', error)
    }
  })

  // チーム別のラップタイム取得
  socket.on('getTeamLaps', async (teamId) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM lap_times WHERE team_id = ? ORDER BY created_at DESC',
        [teamId]
      )
      socket.emit('teamLapsReceived', rows)
    } catch (error) {
      console.error('Error fetching team laps:', error)
    }
  })

  // 区間別のラップタイム取得
  socket.on('getSectionLaps', async (section) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM lap_times WHERE section = ? ORDER BY created_at DESC',
        [section]
      )
      socket.emit('sectionLapsReceived', rows)
    } catch (error) {
      console.error('Error fetching section laps:', error)
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 