import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useTimer } from '../contexts/TimerContext';
import { formatTime } from '../utils/timeUtils';

function LiveResultsPage() {
  const [results, setResults] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const { socket } = useSocket();
  const { resultsCleared } = useTimer();

  useEffect(() => {
    if (!socket) return;

    // 結果更新イベントのリスナー
    const handleLiveResults = (data) => {
      console.log('LiveResultsPage: Received live results data:', data.length, 'items');
      
      // データが配列でない場合は処理しない
      if (!Array.isArray(data)) {
        console.error('LiveResultsPage: Received invalid data format');
        return;
      }
      
      // セッションIDを取得（最初のデータから）
      if (data.length > 0 && data[0].sessionId && !currentSessionId) {
        setCurrentSessionId(data[0].sessionId);
        console.log('LiveResultsPage: Set current session ID:', data[0].sessionId);
      }
      
      // 現在のセッションIDに一致するデータのみをフィルタリング
      if (currentSessionId) {
        const filteredData = data.filter(item => {
          const itemSessionId = item.sessionId || item.session_id;
          return itemSessionId === currentSessionId;
        });
        
        console.log('LiveResultsPage: Filtered data by session ID:', 
          filteredData.length, 'of', data.length, 'items match session ID:', currentSessionId);
        
        // 番号順にソート
        const sortedData = filteredData.sort((a, b) => a.number - b.number);
        setResults(sortedData);
      } else if (data.length > 0) {
        // セッションIDがまだ設定されていない場合は、最初のデータのセッションIDを使用
        const firstSessionId = data[0].sessionId || data[0].session_id;
        if (firstSessionId) {
          setCurrentSessionId(firstSessionId);
          console.log('LiveResultsPage: Setting session ID from first data item:', firstSessionId);
          
          const filteredData = data.filter(item => {
            const itemSessionId = item.sessionId || item.session_id;
            return itemSessionId === firstSessionId;
          });
          
          // 番号順にソート
          const sortedData = filteredData.sort((a, b) => a.number - b.number);
          setResults(sortedData);
        } else {
          // セッションIDがない場合は全データを表示
          const sortedData = [...data].sort((a, b) => a.number - b.number);
          setResults(sortedData);
        }
      } else {
        // データがない場合は空の配列を設定
        setResults([]);
      }
    };
    
    // リセット確認イベントのリスナー
    const handleResetConfirmed = (data) => {
      console.log('LiveResultsPage: Reset confirmed:', data);
      if (data && data.sessionId) {
        setCurrentSessionId(data.sessionId);
        console.log('LiveResultsPage: Updated session ID after reset:', data.sessionId);
      }
      setResults([]);
    };
    
    // 結果クリアイベントのリスナー
    const handleResultsCleared = () => {
      console.log('LiveResultsPage: Results cleared event received');
      setResults([]);
    };
    
    // イベントリスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults);
    socket.on('resetConfirmed', handleResetConfirmed);
    socket.on('resultsCleared', handleResultsCleared);
    
    // 初期データのリクエスト
    socket.emit('getLiveResults');
    
    // クリーンアップ関数
    return () => {
      socket.off('liveResultsUpdated', handleLiveResults);
      socket.off('resetConfirmed', handleResetConfirmed);
      socket.off('resultsCleared', handleResultsCleared);
    };
  }, [socket, currentSessionId]);
  
  // タイマーがリセットされた時の処理
  useEffect(() => {
    if (resultsCleared) {
      console.log('LiveResultsPage: Timer was reset, clearing results');
      setResults([]);
      setCurrentSessionId(null);
    }
  }, [resultsCleared]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">リアルタイム結果</h1>
      
      {results.length === 0 ? (
        <p className="text-gray-500">まだ記録されたラップはありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">No.</th>
                <th className="py-3 px-6 text-left">タイム</th>
                <th className="py-3 px-6 text-left">記録時刻</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {results.map((result, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">{result.number}</td>
                  <td className="py-3 px-6 text-left">{formatTime(result.total_time)}</td>
                  <td className="py-3 px-6 text-left">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* デバッグ情報（開発時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">デバッグ情報:</h3>
          <p>現在のセッションID: {currentSessionId || 'なし'}</p>
          <p>表示中のデータ数: {results.length}</p>
          <button 
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
            onClick={() => {
              if (socket) {
                socket.emit('clearResults');
                console.log('LiveResultsPage: Manually requested to clear results');
              }
            }}
          >
            データをクリア
          </button>
        </div>
      )}
    </div>
  );
}

export default LiveResultsPage; 