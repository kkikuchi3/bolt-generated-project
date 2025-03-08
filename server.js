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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// リクエストロギングミドルウェア
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    success: false,
    message: 'サーバーエラーが発生しました',
    error: err.message
  });
});

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
    console.log('データベースに接続を試みています...');
    console.log('接続設定:', {
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      database: DB_CONFIG.database,
      port: DB_CONFIG.port
    });
    
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('データベースに正常に接続しました');
    
    // 接続テスト
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('データベース接続テスト成功:', result);
    
    return connection;
  } catch (error) {
    console.error('データベース接続エラー:', error);
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    console.error('エラースタック:', error.stack);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('データベースが存在しません。データベースを作成してください。');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('データベースサーバーに接続できません。サーバーが起動しているか確認してください。');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('データベースへのアクセスが拒否されました。ユーザー名とパスワードを確認してください。');
    }
    
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
        
        // テーブル構造を確認するためのヘルパー関数
        const checkTableStructure = async (tableName) => {
          try {
            const [columns] = await dbConnection.execute(`DESCRIBE ${tableName}`);
            console.log(`${tableName} テーブルの構造:`, columns.map(col => col.Field));
            return columns;
          } catch (error) {
            console.error(`${tableName} テーブル構造の確認に失敗:`, error);
            return [];
          }
        };

        // 外部キー制約を確認する関数
        const checkForeignKeys = async (tableName) => {
          try {
            const [keys] = await dbConnection.execute(`
              SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
              FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
              WHERE REFERENCED_TABLE_NAME = ?
            `, [tableName]);
            console.log(`${tableName} テーブルを参照している外部キー:`, keys);
            return keys;
          } catch (error) {
            console.error(`${tableName} の外部キー確認に失敗:`, error);
            return [];
          }
        };

        // テーブルが存在するか確認する関数
        const tableExists = async (tableName) => {
          try {
            const [tables] = await dbConnection.execute(`SHOW TABLES LIKE '${tableName}'`);
            return tables.length > 0;
          } catch (error) {
            console.error(`テーブル ${tableName} の存在確認に失敗:`, error);
            return false;
          }
        };
        
        // lap_times テーブルの確認と作成
        const [lapTimesTable] = await dbConnection.execute(
          "SHOW TABLES LIKE 'lap_times'"
        );
        
        if (lapTimesTable.length === 0) {
          console.log('lap_times テーブルが存在しない場合は作成');
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
          console.log('lap_times テーブル構造を確認');
          const columns = await checkTableStructure('lap_times');
          const hasSessionId = columns.some(col => col.Field === 'session_id');
          
          if (hasSessionId) {
            console.log('session_id カラムを削除します...');
            await dbConnection.execute("ALTER TABLE lap_times DROP COLUMN session_id");
            console.log('session_id カラムを削除しました');
          }
        }

        // 'racers' テーブルの存在を確認
        const racersExists = await tableExists('racers');
        
        if (racersExists) {
          console.log('racers テーブルが存在します。外部キー制約を確認します。');
          const foreignKeys = await checkForeignKeys('teams');
          
          // 外部キー制約を削除
          for (const key of foreignKeys) {
            if (key.TABLE_NAME === 'racers') {
              console.log(`racers テーブルの外部キー制約 ${key.CONSTRAINT_NAME} を削除します...`);
              await dbConnection.execute(`ALTER TABLE racers DROP FOREIGN KEY ${key.CONSTRAINT_NAME}`);
              console.log(`外部キー制約 ${key.CONSTRAINT_NAME} を削除しました`);
            }
          }
          
          // racers テーブルを削除
          console.log('racers テーブルを削除します...');
          await dbConnection.execute("DROP TABLE IF EXISTS racers");
          console.log('racers テーブルを削除しました');
        }

        // teams テーブルの確認と作成
        const teamsExists = await tableExists('teams');
        
        if (!teamsExists) {
          console.log('teams テーブルが存在しない場合は作成');
          await dbConnection.execute(`
            CREATE TABLE teams (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              bib_number VARCHAR(50) NOT NULL,
              division VARCHAR(50) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
          `);
          console.log('teams テーブルを作成しました');
        } else {
          // teams テーブルの構造を確認
          console.log('teams テーブル構造を確認');
          const columns = await checkTableStructure('teams');
          
          // bib_number カラムが存在するか確認
          const hasBibNumber = columns.some(col => col.Field === 'bib_number');
          if (!hasBibNumber) {
            console.log('bib_number カラムが見つかりません。テーブルを再作成します...');
            
            // バックアップテーブルが存在する場合は削除
            const backupExists = await tableExists('teams_backup');
            if (backupExists) {
              console.log('既存のバックアップテーブルを削除します...');
              await dbConnection.execute("DROP TABLE IF EXISTS teams_backup");
              console.log('teams_backup テーブルを削除しました');
            }
            
            // 既存のテーブルをバックアップ
            console.log('teams テーブルをバックアップします...');
            await dbConnection.execute("CREATE TABLE teams_backup LIKE teams");
            await dbConnection.execute("INSERT INTO teams_backup SELECT * FROM teams");
            console.log('teams テーブルをバックアップしました');
            
            // runners テーブルを一時的に削除（外部キー制約のため）
            await dbConnection.execute("DROP TABLE IF EXISTS runners");
            console.log('runners テーブルを削除しました');
            
            // teams テーブルを削除して再作成
            await dbConnection.execute("DROP TABLE teams");
            await dbConnection.execute(`
              CREATE TABLE teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                bib_number VARCHAR(50) NOT NULL,
                division VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
              )
            `);
            console.log('teams テーブルを再作成しました');
            
            // バックアップからデータを復元（bib_number カラムはデフォルト値を設定）
            try {
              console.log('バックアップからデータを復元します...');
              await dbConnection.execute(`
                INSERT INTO teams (id, name, bib_number, division, created_at, updated_at)
                SELECT id, name, '00', 'general', created_at, NOW() FROM teams_backup
              `);
              console.log('バックアップからデータを復元しました');
            } catch (restoreError) {
              console.error('バックアップからのデータ復元に失敗:', restoreError);
            }
          } else {
            console.log('bib_number カラムは正常に存在します');
          }
        }

        // runners テーブルの確認と作成
        const runnersExists = await tableExists('runners');
        
        if (!runnersExists) {
          console.log('runners テーブルが存在しない場合は作成');
          await dbConnection.execute(`
            CREATE TABLE runners (
              id INT AUTO_INCREMENT PRIMARY KEY,
              team_id INT NOT NULL,
              name VARCHAR(255) NOT NULL,
              position INT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
            )
          `);
          console.log('runners テーブルを作成しました');
        } else {
          // runners テーブルの構造を確認
          console.log('runners テーブル構造を確認');
          await checkTableStructure('runners');
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
  
  socket.on('notifyReset', (data) => {
    console.log('リセット通知を受信:', data);
    
    if (data && data.onInitialization) {
      console.log('初期化時のリセット通知は無視します');
      return;
    }
    
    if (data && data.explicit) {
      console.log('明示的なリセット通知を受け取りました');
      socket.resetNotified = true;
    } else {
      console.log('非明示的なリセット通知は無視します');
    }
  });
  
  socket.on('clearResults', async () => {
    console.log('結果のクリアリクエストを受信');
    
    if (!socket.resetNotified) {
      console.log('リセット通知なしでのクリアリクエストは無視します');
      return;
    }
    
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
    
    socket.resetNotified = false;
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

// チーム関連の関数
async function getTeamsWithRunners(connection) {
  if (!connection) return [];

  try {
    console.log('全てのチームと走者情報を取得');
    
    const [teams] = await connection.execute(
      'SELECT * FROM teams ORDER BY id ASC'
    );
    
    // 各チームの走者情報を取得
    for (const team of teams) {
      const [runners] = await connection.execute(
        'SELECT * FROM runners WHERE team_id = ? ORDER BY position ASC',
        [team.id]
      );
      
      // キャメルケースに変換
      team.bibNumber = team.bib_number;
      delete team.bib_number;
      
      team.runners = runners.map(runner => ({
        id: runner.id,
        name: runner.name,
        position: runner.position
      }));
    }
    
    console.log(`データベースから ${teams.length} 件のチームデータを取得しました`);
    return teams;
  } catch (error) {
    console.error('チーム情報取得中にエラーが発生:', error);
    return [];
  }
}

async function saveTeam(team, connection) {
  if (!connection) return null;

  try {
    console.log('チーム情報をデータベースに保存');
    
    // トランザクション開始
    await connection.beginTransaction();
    
    // チーム情報を保存
    const [teamResult] = await connection.execute(
      'INSERT INTO teams (name, bib_number, division) VALUES (?, ?, ?)',
      [team.name, team.bibNumber, team.division]
    );
    
    const teamId = teamResult.insertId;
    
    // 走者情報を保存
    for (const runner of team.runners) {
      await connection.execute(
        'INSERT INTO runners (team_id, name, position) VALUES (?, ?, ?)',
        [teamId, runner.name, runner.position]
      );
    }
    
    // トランザクションをコミット
    await connection.commit();
    
    // 保存したチーム情報を取得して返す
    const savedTeams = await getTeamsWithRunners(connection);
    const savedTeam = savedTeams.find(t => t.id === teamId);
    
    console.log(`チーム情報をデータベースに保存しました: ID=${teamId}`);
    return savedTeam;
  } catch (error) {
    // エラー時はロールバック
    if (connection) {
      await connection.rollback();
    }
    console.error('チーム情報保存中にエラーが発生:', error);
    return null;
  }
}

async function updateTeam(teamId, team, connection) {
  if (!connection) return null;

  try {
    console.log(`チーム情報を更新: ID=${teamId}`);
    
    // トランザクション開始
    await connection.beginTransaction();
    
    // チーム情報を更新
    await connection.execute(
      'UPDATE teams SET name = ?, bib_number = ?, division = ? WHERE id = ?',
      [team.name, team.bibNumber, team.division, teamId]
    );
    
    // 既存の走者情報を削除
    await connection.execute(
      'DELETE FROM runners WHERE team_id = ?',
      [teamId]
    );
    
    // 走者情報を再登録
    for (const runner of team.runners) {
      await connection.execute(
        'INSERT INTO runners (team_id, name, position) VALUES (?, ?, ?)',
        [teamId, runner.name, runner.position]
      );
    }
    
    // トランザクションをコミット
    await connection.commit();
    
    // 更新したチーム情報を取得して返す
    const updatedTeams = await getTeamsWithRunners(connection);
    const updatedTeam = updatedTeams.find(t => t.id === parseInt(teamId));
    
    console.log(`チーム情報を更新しました: ID=${teamId}`);
    return updatedTeam;
  } catch (error) {
    // エラー時はロールバック
    if (connection) {
      await connection.rollback();
    }
    console.error('チーム情報更新中にエラーが発生:', error);
    return null;
  }
}

async function deleteTeam(teamId, connection) {
  if (!connection) return false;

  try {
    console.log(`チームを削除: ID=${teamId}`);
    
    // 外部キー制約があるため、走者情報は自動的に削除される
    await connection.execute(
      'DELETE FROM teams WHERE id = ?',
      [teamId]
    );
    
    console.log(`チームを削除しました: ID=${teamId}`);
    return true;
  } catch (error) {
    console.error('チーム削除中にエラーが発生:', error);
    return false;
  }
}

async function saveBatchTeams(teams, connection) {
  if (!connection) return [];

  try {
    console.log(`${teams.length} 件のチームを一括登録`);
    
    const savedTeams = [];
    
    // トランザクション開始
    await connection.beginTransaction();
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      console.log(`チーム登録 (${i+1}/${teams.length}): ${team.name}, ゼッケン: ${team.bibNumber}`);
      
      try {
        // チーム情報を保存
        const [teamResult] = await connection.execute(
          'INSERT INTO teams (name, bib_number, division) VALUES (?, ?, ?)',
          [team.name, team.bibNumber, team.division]
        );
        
        const teamId = teamResult.insertId;
        console.log(`チーム保存完了: ID=${teamId}`);
        
        // 走者情報を保存
        for (let j = 0; j < team.runners.length; j++) {
          const runner = team.runners[j];
          await connection.execute(
            'INSERT INTO runners (team_id, name, position) VALUES (?, ?, ?)',
            [teamId, runner.name, runner.position]
          );
        }
        console.log(`走者情報保存完了: チームID=${teamId}, 走者数=${team.runners.length}`);
        
        // 保存したチーム情報を構築
        const savedTeam = {
          id: teamId,
          name: team.name,
          bibNumber: team.bibNumber,
          division: team.division,
          runners: team.runners.map(runner => ({
            name: runner.name,
            position: runner.position
          }))
        };
        
        savedTeams.push(savedTeam);
      } catch (error) {
        console.error(`チーム "${team.name}" の保存中にエラーが発生:`, error);
        throw error; // エラーを再スローしてトランザクションをロールバック
      }
    }
    
    // トランザクションをコミット
    await connection.commit();
    
    console.log(`${savedTeams.length} 件のチームを一括登録しました`);
    return savedTeams;
  } catch (error) {
    // エラー時はロールバック
    if (connection) {
      try {
        await connection.rollback();
        console.log('トランザクションをロールバックしました');
      } catch (rollbackError) {
        console.error('ロールバック中にエラーが発生:', rollbackError);
      }
    }
    console.error('チーム一括登録中にエラーが発生:', error);
    throw error; // エラーを再スローして呼び出し元で処理できるようにする
  }
}

// チーム管理のAPIエンドポイント
app.get('/api/teams', async (req, res) => {
  try {
    console.log('チーム一覧取得リクエストを受信');
    
    if (!dbConnection) {
      console.log('データベース接続がないため、接続を試みます');
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      const teams = await getTeamsWithRunners(dbConnection);
      console.log(`${teams.length}件のチーム情報を返します`);
      res.setHeader('Content-Type', 'application/json');
      res.json(teams);
    } else {
      console.error('データベース接続が利用できません');
      res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
  } catch (error) {
    console.error('チーム一覧取得中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      message: 'チーム情報の取得に失敗しました',
      error: error.message
    });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    console.log('チーム登録リクエストを受信:', req.body);
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      const savedTeam = await saveTeam(req.body, dbConnection);
      
      if (savedTeam) {
        res.status(201).json(savedTeam);
      } else {
        res.status(500).json({
          success: false,
          message: 'チームの保存に失敗しました'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
  } catch (error) {
    console.error('チーム登録中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  try {
    const teamId = req.params.id;
    console.log(`チーム更新リクエストを受信: ID=${teamId}`, req.body);
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      const updatedTeam = await updateTeam(teamId, req.body, dbConnection);
      
      if (updatedTeam) {
        res.json(updatedTeam);
      } else {
        res.status(404).json({
          success: false,
          message: 'チームが見つからないか、更新に失敗しました'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
  } catch (error) {
    console.error('チーム更新中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    const teamId = req.params.id;
    console.log(`チーム削除リクエストを受信: ID=${teamId}`);
    
    if (!dbConnection) {
      dbConnection = await connectToDatabase();
    }
    
    if (dbConnection) {
      const success = await deleteTeam(teamId, dbConnection);
      
      if (success) {
        res.json({
          success: true,
          message: 'チームを削除しました'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'チームが見つからないか、削除に失敗しました'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
  } catch (error) {
    console.error('チーム削除中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/teams/batch', async (req, res) => {
  try {
    console.log(`チーム一括登録リクエストを受信: ${req.body.length} 件`);
    
    // リクエストの検証
    if (!Array.isArray(req.body) || req.body.length === 0) {
      console.error('無効なリクエストデータ:', req.body);
      return res.status(400).json({
        success: false,
        message: '有効なチームデータが提供されていません'
      });
    }
    
    // データベース接続の確認
    if (!dbConnection) {
      console.log('データベース接続がないため、接続を試みます');
      dbConnection = await connectToDatabase();
    }
    
    if (!dbConnection) {
      console.error('データベース接続の確立に失敗しました');
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }
    
    // 各チームのデータを検証
    for (let i = 0; i < req.body.length; i++) {
      const team = req.body[i];
      if (!team.name || !team.bibNumber || !team.division || !Array.isArray(team.runners) || team.runners.length === 0) {
        console.error(`チームデータ ${i+1} が不完全です:`, team);
        return res.status(400).json({
          success: false,
          message: `チームデータ ${i+1} が不完全です。すべての必須フィールドを入力してください。`
        });
      }
    }
    
    // チームの一括登録
    console.log('チームの一括登録を開始します...');
    const savedTeams = await saveBatchTeams(req.body, dbConnection);
    
    if (savedTeams.length > 0) {
      console.log(`${savedTeams.length} 件のチームを正常に登録しました`);
      res.status(201).json(savedTeams);
    } else {
      console.error('チームの一括登録に失敗しました: 保存されたチームがありません');
      res.status(500).json({
        success: false,
        message: 'チームの一括登録に失敗しました'
      });
    }
  } catch (error) {
    console.error('チーム一括登録中にエラーが発生:', error);
    res.status(500).json({
      success: false,
      message: 'チームの一括登録に失敗しました',
      error: error.message || '不明なエラー'
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