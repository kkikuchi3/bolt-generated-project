import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// MySQL接続プールの作成（データベース指定なし）
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// データベース初期化関数
async function initializeDatabase() {
  let connection;
  try {
    // まず接続を確立
    connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');

    // データベースが存在しない場合は作成
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log('Database created or already exists');

    // データベースを使用
    await connection.query(`USE ${process.env.DB_NAME}`);
    console.log('Using database:', process.env.DB_NAME);
    
    // テーブルの作成
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lap_times (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        number INT NOT NULL,
        total_time BIGINT NOT NULL,
        timestamp VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table created or already exists');
    
    // テストデータの確認
    const [rows] = await connection.query('SELECT * FROM lap_times');
    console.log('Current records:', rows);

    // 接続プールを再作成（データベースを指定）
    pool.end();
    global.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

// サーバー起動時に初期化を実行
await initializeDatabase();

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

// データベース接続テスト関数を追加
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('Database connection successful')
    
    // テストクエリを実行
    const [rows] = await connection.query('SELECT * FROM lap_times')
    console.log('Current records in database:', rows)
    
    connection.release()
  } catch (error) {
    console.error('Database connection test failed:', error)
  }
}

// サーバー起動時にテスト実行
testDatabaseConnection()

// グローバルプールを使用するように修正
const getPool = () => global.pool || pool;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // 接続時に保存されているラップタイムを送信
  async function sendInitialData() {
    try {
      const currentPool = getPool();
      const [rows] = await currentPool.query('SELECT * FROM lap_times ORDER BY number ASC');
      console.log(`Sending ${rows.length} initial records to client ${socket.id}`);
      socket.emit('liveResultsUpdated', rows);
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }
  
  // 接続直後にデータを送信
  sendInitialData();

  // ラップタイム記録
  socket.on('recordLap', async (lapData) => {
    try {
      console.log('Recording new lap:', lapData);
      const currentPool = getPool();

      // データベースに保存
      await currentPool.query(
        'INSERT INTO lap_times (number, total_time, timestamp) VALUES (?, ?, ?)',
        [lapData.number, lapData.total_time, lapData.timestamp]
      );

      // 全データを取得して全クライアントに送信
      const [rows] = await currentPool.query('SELECT * FROM lap_times ORDER BY number ASC');
      console.log('Broadcasting updated records to all clients');
      io.emit('liveResultsUpdated', rows);
    } catch (error) {
      console.error('Error recording lap:', error);
    }
  });

  // リアルタイム結果の取得リクエスト
  socket.on('getLiveResults', async () => {
    try {
      const currentPool = getPool();
      const [rows] = await currentPool.query('SELECT * FROM lap_times ORDER BY number ASC');
      console.log(`Sending ${rows.length} records to client ${socket.id}`);
      socket.emit('liveResultsUpdated', rows);
    } catch (error) {
      console.error('Error getting live results:', error);
    }
  });

  // リセット処理
  socket.on('resetTimer', async () => {
    try {
      const currentPool = getPool();
      await currentPool.query('TRUNCATE TABLE lap_times');
      console.log('Timer reset, all records cleared');
      io.emit('liveResultsUpdated', []);
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  });

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
    console.log('Client disconnected:', socket.id);
  });
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 