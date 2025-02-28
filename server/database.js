import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config()

// MySQL接続プールの作成
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// データベース初期化関数を修正
async function initializeDatabase() {
  try {
    console.log('データベース初期化を開始...');
    
    // まずデータベースをリセット
    await resetDatabase();
    
    // テーブルを新規作成（session_idカラムを含む）
    await pool.execute(`
      CREATE TABLE lap_times (
        id INT AUTO_INCREMENT PRIMARY KEY,
        number INT NOT NULL,
        total_time BIGINT NOT NULL,
        timestamp VARCHAR(255),
        session_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('データベース初期化完了（テーブル作成済み）');
    return true;
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return false;
  }
}

// チーム追加
async function addTeam(teamData) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO teams (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
      [teamData.id, teamData.name, teamData.name]
    )
    return result
  } catch (error) {
    console.error('チーム追加エラー:', error)
    throw error
  }
}

// ラップタイム記録
async function recordLapTime(lapData) {
  try {
    const [result] = await pool.execute(`
      INSERT INTO lap_times 
      (team_id, lap_number, lap_time, total_time) 
      VALUES (
        ?, 
        COALESCE((SELECT MAX(lap_number) + 1 FROM lap_times WHERE team_id = ?), 1),
        ?, ?
      )
    `, [
      lapData.teamId, 
      lapData.teamId, 
      lapData.lapTime, 
      lapData.totalTime
    ])
    return result
  } catch (error) {
    console.error('ラップタイム記録エラー:', error)
    throw error
  }
}

// チーム一覧取得
async function getTeams() {
  try {
    const [rows] = await pool.execute('SELECT * FROM teams')
    return rows
  } catch (error) {
    console.error('チーム一覧取得エラー:', error)
    throw error
  }
}

// チームのラップタイム取得
async function getLapTimesByTeam(teamId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM lap_times WHERE team_id = ? ORDER BY lap_number', 
      [teamId]
    )
    return rows
  } catch (error) {
    console.error('ラップタイム取得エラー:', error)
    throw error
  }
}

// 初期化の実行
initDatabase()

export default {
  addTeam,
  recordLapTime,
  getTeams,
  getLapTimesByTeam,
  pool  // 必要に応じて直接接続を使用できるように公開
}
