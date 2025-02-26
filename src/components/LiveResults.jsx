import React, { useEffect, useState, useCallback } from 'react'
import { useSocket } from '../contexts/SocketContext'

function LiveResults() {
  const { socket, isConnected } = useSocket()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // データ取得関数
  const fetchData = useCallback(() => {
    if (socket && isConnected) {
      console.log('LiveResults: Requesting data from server')
      setLoading(true)
      socket.emit('getLiveResults')
    }
  }, [socket, isConnected])

  // 接続状態が変わったときの処理
  useEffect(() => {
    console.log('LiveResults: Connection state changed:', isConnected)
    if (isConnected) {
      fetchData()
    }
  }, [isConnected, fetchData])

  // ソケットイベントのリスナー設定
  useEffect(() => {
    if (!socket) {
      console.log('LiveResults: Socket not available yet')
      return
    }

    console.log('LiveResults: Setting up socket listeners')
    
    // 結果更新のリスナー
    const handleLiveResults = (data) => {
      console.log('LiveResults: Received data:', data)
      if (Array.isArray(data)) {
        // データの構造をコンソールに出力して確認
        if (data.length > 0) {
          console.log('LiveResults: Sample data structure:', JSON.stringify(data[0]))
        }
        
        // データを新しい順に並べ替え
        const sortedData = [...data].reverse()
        setResults(sortedData)
        setLoading(false)
      } else {
        console.warn('LiveResults: Received invalid data format')
        setError('データ形式が不正です')
        setLoading(false)
      }
    }

    // 新しい記録が追加されたときのハンドラー
    const handleNewResult = (data) => {
      console.log('LiveResults: New result received:', data)
      if (data) {
        // 新しい記録を先頭に追加
        setResults(prevResults => [data, ...prevResults])
      }
    }

    // リスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults)
    socket.on('newResult', handleNewResult)
    socket.on('recordAdded', handleNewResult)

    // クリーンアップ関数
    return () => {
      console.log('LiveResults: Removing listeners')
      socket.off('liveResultsUpdated', handleLiveResults)
      socket.off('newResult', handleNewResult)
      socket.off('recordAdded', handleNewResult)
    }
  }, [socket])

  // 手動更新ボタンのハンドラー
  const handleRefresh = () => {
    fetchData()
  }

  // タイム表示形式を整える関数 - 00:00:00形式に変更
  const formatTime = (ms) => {
    // 値がない場合や0の場合の処理
    if (ms === undefined || ms === null) return '00:00:00'
    
    // 数値に変換
    const timeMs = Number(ms)
    if (isNaN(timeMs)) return '00:00:00'
    
    const hours = Math.floor(timeMs / 3600000)
    const minutes = Math.floor((timeMs % 3600000) / 60000)
    const seconds = Math.floor((timeMs % 60000) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // デバッグ用：データ構造を表示
  useEffect(() => {
    if (results.length > 0) {
      console.log('LiveResults: Current results structure:', results[0])
    }
  }, [results])

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ラップ記録</h2>
        <div className="flex items-center space-x-4">
          <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '接続中' : '未接続'}
          </div>
          <button 
            onClick={handleRefresh}
            disabled={!isConnected}
            className={`px-3 py-1 text-sm rounded ${
              isConnected 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            更新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">読み込み中...</span>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : results.length === 0 ? (
        <p className="text-gray-500 text-center py-4">記録はまだありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ゼッケン
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイム
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  記録時刻
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => {
                // 各フィールドの存在を確認してデバッグ
                console.log(`Result ${index}:`, {
                  id: result.id,
                  bibNumber: result.bibNumber,
                  number: result.number,
                  time: result.time,
                  total_time: result.total_time,
                  lapTime: result.lapTime,
                  timestamp: result.timestamp
                });
                
                return (
                  <tr key={result.id || index} className={index === 0 ? "bg-green-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.id || index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.bibNumber || result.number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {formatTime(result.time || result.total_time || result.lapTime || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LiveResults 