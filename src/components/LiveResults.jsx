import React, { useEffect, useState } from 'react'
import { useTimer } from '../contexts/TimerContext'

function LiveResults() {
  const [results, setResults] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const { socket } = useTimer()

  useEffect(() => {
    if (!socket) {
      console.warn('No socket available')
      return
    }

    const handleConnect = () => {
      console.log('LiveResults connected to server')
      setIsConnected(true)
      socket.emit('getLiveResults')
    }

    const handleDisconnect = () => {
      console.log('LiveResults disconnected from server')
      setIsConnected(false)
    }

    const handleLiveResults = (data) => {
      console.log('LiveResults received data:', data)
      if (Array.isArray(data)) {
        console.log(`Setting ${data.length} results:`, data)
        setResults(data)
      } else {
        console.warn('Received non-array data:', data)
      }
    }

    // 初期状態の設定
    const isCurrentlyConnected = socket.connected
    console.log('Current socket connection status:', isCurrentlyConnected)
    setIsConnected(isCurrentlyConnected)
    
    if (isCurrentlyConnected) {
      console.log('Requesting initial data on mount')
      socket.emit('getLiveResults')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('liveResultsUpdated', handleLiveResults)

    // コンポーネントのマウント時のデバッグ情報
    console.log('LiveResults component mounted')

    return () => {
      console.log('LiveResults component unmounting')
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('liveResultsUpdated', handleLiveResults)
    }
  }, [socket])

  // resultsの変更を監視
  useEffect(() => {
    console.log('Results updated:', results)
  }, [results])

  const formatTime = (ms) => {
    if (!ms) return '00:00:00.00'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ラップ記録</h2>
        <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? '接続中' : '未接続'}
        </div>
      </div>

      {results.length === 0 ? (
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
                <tr key={result.id}>
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