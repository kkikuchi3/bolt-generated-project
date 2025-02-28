import React, { useEffect, useState, useCallback } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useTimer } from '../contexts/TimerContext'

function LiveResults() {
  const { socket, isConnected } = useSocket()
  const { resultsCleared, liveResults } = useTimer()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [dataCleared, setDataCleared] = useState(false)

  // データ取得関数
  const fetchData = useCallback(() => {
    if (!socket || !isConnected) {
      setLoading(false)
      return
    }

    // リセット状態の場合はデータを取得しない
    if (resultsCleared || dataCleared) {
      console.log('LiveResults: Not fetching data due to reset state')
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    socket.emit('getLiveResults')
    setLastRefresh(Date.now())
  }, [socket, isConnected, resultsCleared, dataCleared])

  // 初回マウント時とソケット接続時にデータ取得
  useEffect(() => {
    if (isConnected && !resultsCleared && !dataCleared) {
      fetchData()
    }
  }, [isConnected, fetchData, resultsCleared, dataCleared])

  // TimerContextからのliveResultsを監視
  useEffect(() => {
    if (resultsCleared || dataCleared) {
      setResults([])
      return
    }
    
    if (liveResults && Array.isArray(liveResults)) {
      setResults(liveResults)
      setLoading(false)
    }
  }, [liveResults, resultsCleared, dataCleared])

  // リセット状態を監視
  useEffect(() => {
    if (resultsCleared) {
      console.log('LiveResults: Timer was reset, clearing local results')
      setResults([])
      setLoading(false)
      setDataCleared(true)
      
      // サーバーにもクリアリクエストを送信
      if (socket && isConnected) {
        socket.emit('notifyReset')
        socket.emit('clearResults')
      }
    } else if (!resultsCleared && dataCleared) {
      // リセット状態が解除されたらデータクリアフラグもリセット
      setDataCleared(false)
    }
  }, [resultsCleared, socket, isConnected])

  // 定期的にデータを更新
  useEffect(() => {
    const interval = setInterval(() => {
      // リセット状態でなければデータを更新
      if (!resultsCleared && !dataCleared && socket && isConnected) {
        console.log('LiveResults: Auto-refreshing data')
        fetchData()
      }
    }, 30000) // 30秒ごとに更新
    
    return () => clearInterval(interval)
  }, [fetchData, resultsCleared, dataCleared, socket, isConnected])

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
      
      // リセット状態の場合はデータを無視
      if (resultsCleared || dataCleared) {
        console.log('LiveResults: Ignoring data due to reset state')
        return
      }
      
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
      
      // リセット状態の場合はデータを無視
      if (resultsCleared || dataCleared) {
        console.log('LiveResults: Ignoring new result due to reset state')
        return
      }
      
      if (data) {
        // 新しい記録を先頭に追加
        setResults(prevResults => [data, ...prevResults])
      }
    }

    // リセットイベントのハンドラー
    const handleResultsCleared = () => {
      console.log('LiveResults: Results cleared event received')
      setResults([])
      setLoading(false)
      setDataCleared(true)
    }

    // リスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults)
    socket.on('newResult', handleNewResult)
    socket.on('recordAdded', handleNewResult)
    socket.on('resultsCleared', handleResultsCleared)

    // クリーンアップ関数
    return () => {
      console.log('LiveResults: Removing listeners')
      socket.off('liveResultsUpdated', handleLiveResults)
      socket.off('newResult', handleNewResult)
      socket.off('recordAdded', handleNewResult)
      socket.off('resultsCleared', handleResultsCleared)
    }
  }, [socket, resultsCleared, dataCleared])

  // 手動更新ボタンのハンドラー
  const handleRefresh = () => {
    // リセット状態の場合は更新しない
    if (resultsCleared || dataCleared) {
      console.log('LiveResults: Not refreshing due to reset state')
      return
    }
    
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
          <span className="text-sm text-gray-500 mr-3">
            {lastRefresh ? `最終更新: ${new Date(lastRefresh).toLocaleTimeString()}` : ''}
          </span>
          <button
            onClick={handleRefresh}
            className={`px-3 py-1 text-sm rounded ${
              isConnected && !resultsCleared && !dataCleared
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!isConnected || loading || resultsCleared || dataCleared}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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
          <p>{error}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>記録はありません</p>
          {(resultsCleared || dataCleared) && (
            <p className="mt-2 text-sm">タイマーがリセットされました</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイム
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  記録時刻
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {formatTime(result.total_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.timestamp || new Date(result.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LiveResults 