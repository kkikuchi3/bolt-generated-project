import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

function AdminPage() {
  const { socket, isConnected } = useSocket();
  const [settings, setSettings] = useState({
    debugMode: false,
    logLevel: 'info',
    autoSave: true,
    sessionTimeout: 30
  });
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({
    dbConnected: false,
    activeUsers: 0,
    uptime: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // 設定とステータスの取得
  useEffect(() => {
    if (!socket) return;

    // 設定データを受信
    socket.on('adminSettings', (data) => {
      console.log('Received admin settings:', data);
      setSettings(data);
      setLoading(false);
    });

    // ログデータを受信
    socket.on('systemLogs', (data) => {
      console.log('Received system logs:', data.length, 'entries');
      setLogs(data);
    });

    // システムステータスを受信
    socket.on('systemStatus', (data) => {
      console.log('Received system status:', data);
      setStatus(data);
    });

    // 初期データをリクエスト
    socket.emit('getAdminSettings');
    socket.emit('getSystemLogs');
    socket.emit('getSystemStatus');

    // 定期的にステータスを更新
    const statusInterval = setInterval(() => {
      if (isConnected) {
        socket.emit('getSystemStatus');
      }
    }, 10000);

    return () => {
      socket.off('adminSettings');
      socket.off('systemLogs');
      socket.off('systemStatus');
      clearInterval(statusInterval);
    };
  }, [socket, isConnected]);

  // 設定の保存
  const saveSettings = () => {
    if (!socket || !isConnected) {
      setMessage({ type: 'error', text: 'サーバーに接続されていません' });
      return;
    }

    socket.emit('updateAdminSettings', settings);
    setMessage({ type: 'success', text: '設定を保存しました' });
    
    // 3秒後にメッセージを消す
    setTimeout(() => setMessage(null), 3000);
  };

  // データベースのリセット
  const resetDatabase = () => {
    if (!socket || !isConnected) {
      setMessage({ type: 'error', text: 'サーバーに接続されていません' });
      return;
    }

    if (window.confirm('本当にデータベースをリセットしますか？すべてのデータが失われます。')) {
      socket.emit('resetDatabase');
      setMessage({ type: 'info', text: 'データベースをリセットしています...' });
      
      // リセット成功イベント
      socket.once('resetDatabaseSuccess', () => {
        setMessage({ type: 'success', text: 'データベースをリセットしました' });
        setTimeout(() => setMessage(null), 3000);
      });
      
      // リセットエラーイベント
      socket.once('resetDatabaseError', (data) => {
        setMessage({ type: 'error', text: `データベースのリセットに失敗しました: ${data.error}` });
        setTimeout(() => setMessage(null), 5000);
      });
    }
  };

  // ログのクリア
  const clearLogs = () => {
    if (!socket || !isConnected) {
      setMessage({ type: 'error', text: 'サーバーに接続されていません' });
      return;
    }

    socket.emit('clearSystemLogs');
    setMessage({ type: 'success', text: 'ログをクリアしました' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">管理画面</h1>
      
      {/* 接続状態表示 */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? 'サーバー接続中' : 'サーバー未接続'}
        </span>
      </div>
      
      {/* メッセージ表示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' :
          message.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 設定パネル */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">システム設定</h2>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span>デバッグモード</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                詳細なログ出力とデバッグ情報を表示します
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ログレベル
              </label>
              <select
                value={settings.logLevel}
                onChange={(e) => setSettings({ ...settings, logLevel: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="debug">デバッグ (すべて表示)</option>
                <option value="info">情報 (情報以上を表示)</option>
                <option value="warn">警告 (警告以上を表示)</option>
                <option value="error">エラー (エラーのみ表示)</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span>自動保存</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                タイマーの状態を自動的に保存します
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                セッションタイムアウト (分)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
            
            <button
              onClick={saveSettings}
              disabled={!isConnected}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              設定を保存
            </button>
          </div>
        </div>
        
        {/* ステータスパネル */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">システムステータス</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">データベース接続</p>
              <p className={`text-lg ${status.dbConnected ? 'text-green-600' : 'text-red-600'}`}>
                {status.dbConnected ? '接続済み' : '未接続'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">アクティブユーザー</p>
              <p className="text-lg">{status.activeUsers} 人</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">サーバー稼働時間</p>
              <p className="text-lg">{formatUptime(status.uptime)}</p>
            </div>
            
            <div className="pt-4 space-y-2">
              <button
                onClick={resetDatabase}
                disabled={!isConnected}
                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:bg-gray-400"
              >
                データベースをリセット
              </button>
              
              <button
                onClick={() => {
                  if (socket && isConnected) {
                    socket.emit('restartServer');
                    setMessage({ type: 'success', text: 'サーバーを再起動しています...' });
                  }
                }}
                disabled={!isConnected}
                className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 disabled:bg-gray-400"
              >
                サーバーを再起動
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* ログパネル */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">システムログ</h2>
          <button
            onClick={clearLogs}
            disabled={!isConnected}
            className="bg-gray-500 text-white py-1 px-3 rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
          >
            ログをクリア
          </button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">ログはありません</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${getLogColor(log.level)}`}>
                <span className="mr-2">[{new Date(log.timestamp).toLocaleString()}]</span>
                <span className="mr-2">[{log.level.toUpperCase()}]</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 稼働時間のフォーマット
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let result = '';
  if (days > 0) result += `${days}日 `;
  if (hours > 0 || days > 0) result += `${hours}時間 `;
  result += `${minutes}分`;
  
  return result;
}

// ログレベルに応じた色を返す
function getLogColor(level) {
  switch (level.toLowerCase()) {
    case 'error':
      return 'text-red-600';
    case 'warn':
      return 'text-yellow-600';
    case 'info':
      return 'text-blue-600';
    case 'debug':
      return 'text-gray-600';
    default:
      return 'text-gray-800';
  }
}

export default AdminPage; 