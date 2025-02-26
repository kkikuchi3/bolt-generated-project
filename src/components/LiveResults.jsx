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
        setResults(data)
        setLoading(false)
      } else {
        console.warn('LiveResults: Received invalid data format')
        setError('データ形式が不正です')
        setLoading(false)
      }
    }

    // リスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults)

    // クリーンアップ関数
    return () => {
      console.log('LiveResults: Removing listeners')
      socket.off('liveResultsUpdated', handleLiveResults)
    }
  }, [socket])

  // 手動更新ボタンのハンドラー
  const handleRefresh = () => {
    fetchData()
  }

  const formatTime = (ms) => {
    if (!ms && ms !== 0) return '00:00.00'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

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
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ラップ
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
              {results.map((result) => (
                <tr key={result.id || result.number}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {formatTime(result.total_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.timestamp}
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