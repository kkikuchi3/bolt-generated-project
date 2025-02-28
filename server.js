import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mysql from 'mysql2/promise';
import util from 'util';

const PORT = process.env.PORT || 5000;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'relay_stopwatch',
  port: parseInt(process.env.DB_PORT) || 3306
};

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let dbConnection = null;
let liveResults = [];
let dataCleared = false;

const serverLogs = [];
const MAX_LOGS = 100;

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const timestamp = new Date().toISOString();
  const args = Array.from(arguments);
  const message = util.format.apply(null, args);
  const logEntry = { timestamp, level: 'INFO', message };
  
  serverLogs.push(logEntry);
  if (serverLogs.length > MAX_LOGS) serverLogs.shift();
  
  originalConsoleLog.apply(console, [`[${timestamp}] [INFO] ${message}`]);
};

console.error = function() {
  const timestamp = new Date().toISOString();
  const args = Array.from(arguments);
  const message = util.format.apply(null, args);
  const logEntry = { timestamp, level: 'ERROR', message };
  
  serverLogs.push(logEntry);
  if (serverLogs.length > MAX_LOGS) serverLogs.shift();
  
  originalConsoleError.apply(console, [`[${timestamp}] [ERROR] ${message}`]);
};

async function connectToDatabase() {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('データベースに接続しました');
    return connection;
  } catch (error) {
    console.error('データベース接続エラー:', error);
    return null;
  }
}

async function initializeDatabase() {
  console.log('データベース初期化を開始...');
  
  try {
    console.log('データベース接続を開始...');
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      try {
        console.log('テーブルが存在するか確認...');
        
        const [tables] = await dbConnection.execute(
          "SHOW TABLES LIKE 'lap_times'"
        );
        
        if (tables.length === 0) {
          console.log('テーブルが存在しない場合は作成（セッションIDなし）');
          await dbConnection.execute(`
            CREATE TABLE lap_times (
              id INT AUTO_INCREMENT PRIMARY KEY,
              number INT NOT NULL,
              total_time BIGINT NOT NULL,
              timestamp VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('lap_times テーブルを作成しました');
        } else {
          console.log('テーブル構造を確認');
          const [columns] = await dbConnection.execute("DESCRIBE lap_times");
          const hasSessionId = columns.some(col => col.Field === 'session_id');
          
          if (hasSessionId) {
            console.log('session_id カラムを削除します...');
            await dbConnection.execute("ALTER TABLE lap_times DROP COLUMN session_id");
            console.log('session_id カラムを削除しました');
          }
        }
        
        console.log('データベースの初期化が完了しました');
      } catch (error) {
        console.error('テーブル作成/修正エラー:', error);
      }
    }
  } catch (error) {
    console.error('データベース初期化エラー:', error);
  }
}

async function getLapsFromDatabase(connection) {
  if (!connection) return [];

  try {
    console.log('全てのラップタイムを取得');
    
    const [rows] = await connection.execute(
      'SELECT * FROM lap_times ORDER BY number ASC'
    );
    
    console.log(`データベースから ${rows.length} 件のデータを取得しました`);
    return rows;
  } catch (error) {
    console.error('ラップタイム取得中にエラーが発生:', error);
    return [];
  }
}

async function saveLapToDatabase(lap, connection) {
  if (!connection) return false;

  try {
    console.log('ラップタイムをデータベースに保存');
    
    const [result] = await connection.execute(
      'INSERT INTO lap_times (number, total_time, timestamp) VALUES (?, ?, ?)',
      [lap.number, lap.total_time, lap.timestamp]
    );
    
    console.log(`ラップタイムをデータベースに保存しました: ID=${result.insertId}`);
    return true;
  } catch (error) {
    console.error('ラップタイム保存中にエラーが発生:', error);
    return false;
  }
}

async function clearDatabase(connection) {
  if (!connection) return false;

  try {
    console.log('データを削除');
    
    await connection.execute('DELETE FROM lap_times');
    
    console.log('AUTO_INCREMENT をリセット');
    
    await connection.execute('ALTER TABLE lap_times AUTO_INCREMENT = 1');
    
    console.log('データベースをクリアしました');
    
    liveResults = [];
    dataCleared = true;
    
    return true;
  } catch (error) {
    console.error('データベースクリア中にエラーが発生:', error);
    return false;
  }
}

io.on('connection', (socket) => {
  console.log('新しいクライアント接続:', socket.id);
  
  socket.on('getLiveResults', async () => {
    console.log('ライブ結果のリクエストを受信');
    
    try {
      if (!dbConnection) {
        dbConnection = await connectToDatabase();
      }
      
      if (dbConnection) {
        const dbResults = await getLapsFromDatabase(dbConnection);
        
        console.log(`クライアントに ${dbResults.length} 件のデータを送信します`);
        socket.emit('liveResultsUpdated', dbResults);
      } else {
        console.log(`データベース接続なし。メモリ内の ${liveResults.length} 件のデータを送信します`);
        socket.emit('liveResultsUpdated', liveResults);
      }
    } catch (error) {
      console.error('ライブ結果の取得中にエラーが発生:', error);
      socket.emit('liveResultsUpdated', liveResults);
    }
  });
  
  socket.on('recordLap', async (lapData) => {
    console.log('ラップタイム記録リクエストを受信:', lapData);
    
    try {
      const newLap = {
        number: lapData.number,
        total_time: lapData.total_time,
        timestamp: lapData.timestamp || new Date().toLocaleTimeString()
      };
      
      liveResults.push(newLap);
      
      if (!dbConnection) {
        dbConnection = await connectToDatabase();
      }
      
      if (dbConnection) {
        await saveLapToDatabase(newLap, dbConnection);
      }
      
      const resultsToSend = [...liveResults];
      resultsToSend.sort((a, b) => a.number - b.number);
      io.emit('liveResultsUpdated', resultsToSend);
    } catch (error) {
      console.error('ラップタイム記録中にエラーが発生:', error);
    }
  });
  
  socket.on('clearResults', async () => {
    console.log('結果のクリアリクエストを受信');
    
    try {
      if (!dbConnection) {
        dbConnection = await connectToDatabase();
      }
      
      if (dbConnection) {
        await clearDatabase(dbConnection);
        
        io.emit('resultsCleared');
        io.emit('liveResultsUpdated', []);
      }
    } catch (error) {
      console.error('結果のクリア中にエラーが発生:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('クライアントが切断しました:', socket.id);
  });
});

app.get('/api/server-logs', (req, res) => {
  res.json({
    logs: serverLogs,
    count: serverLogs.length
  });
});

app.get('/api/clear-database', async (req, res) => {
  try {
    console.log('手動データベースクリアがリクエストされました');
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      await clearDatabase(dbConnection);
      
      io.emit('resultsCleared');
      io.emit('liveResultsUpdated', []);
      
      res.json({
        success: true,
        message: 'データベースが正常にクリアされました',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
  } catch (error) {
    console.error('手動データベースクリア中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

httpServer.listen(PORT, async () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  
  try {
    console.log('サーバー起動時にデータベース初期化を実行');
    await initializeDatabase();
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      liveResults = await getLapsFromDatabase(dbConnection);
      console.log(`起動時に ${liveResults.length} 件のデータを読み込みました`);
    }
  } catch (error) {
    console.error('サーバー起動時のデータベース初期化エラー:', error);
  }
});