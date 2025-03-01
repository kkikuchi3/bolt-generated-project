import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

function LiveResultsPage() {
  const { socket, isConnected } = useSocket();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 結果データの取得
  useEffect(() => {
    if (!socket) return;

    // ライブ結果を受信
    const handleLiveResults = (data) => {
      console.log('Received live results:', data);
      setResults(data);
      setLoading(false);
    };

    // 結果クリア通知を受信
    const handleResultsCleared = () => {
      console.log('Results cleared');
      setResults([]);
    };

    // エラー処理
    const handleError = (err) => {
      console.error('Error:', err);
      setError(err.message || 'エラーが発生しました');
      setLoading(false);
    };

    // イベントリスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults);
    socket.on('resultsCleared', handleResultsCleared);
    socket.on('error', handleError);

    // 初期データをリクエスト
    socket.emit('getLiveResults');

    return () => {
      socket.off('liveResultsUpdated', handleLiveResults);
      socket.off('resultsCleared', handleResultsCleared);
      socket.off('error', handleError);
    };
  }, [socket]);

  // 時間のフォーマット
  const formatTime = (milliseconds) => {
    if (milliseconds === undefined || milliseconds === null) {
      return '00:00:00';
    }
    
    const ms = parseInt(milliseconds, 10);
    if (isNaN(ms)) {
      return '00:00:00';
    }
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 結果を逆順にして最新のものを上に表示
  const sortedResults = [...results].reverse();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ライブ結果</h1>
      
      {/* 接続状態表示 */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? 'サーバー接続中' : 'サーバー未接続'}
        </span>
      </div>
      
      {/* 結果テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">ラップタイム一覧</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">データを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">まだ結果はありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ラップ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    走者
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    チーム
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    トータル
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    スプリット
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    記録日時
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResults.map((result, index) => (
                  <tr key={index} className={index === 0 ? "bg-blue-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.racer_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.team_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">
                      {formatTime(result.total_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">
                      {formatTime(result.split_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(result.created_at || result.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveResultsPage; 