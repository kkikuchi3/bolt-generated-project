import React, { useState, useEffect } from 'react'
import { useTimer } from '../contexts/TimerContext'
import { useSocket } from '../contexts/SocketContext'

function StopwatchPage() {
  const { 
    isRunning, 
    currentTime, 
    lapTimes, 
    startTimer, 
    stopTimer, 
    resetTimer, 
    recordLap,
    pendingLapTimes,
    isConnected
  } = useTimer()
  
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const { socket } = useSocket()

  // タイマーの表示形式を整える関数
  const formatTime = (ms) => {
    if (!ms && ms !== 0) return '00:00:00.00'
    
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  // ラップタイムの表示形式を整える関数
  const formatLapTime = (ms) => {
    if (!ms && ms !== 0) return '00:00.00'
    
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  // スタート/ストップボタンのハンドラー
  const handleStartStop = () => {
    if (isRunning) {
      stopTimer()
    } else {
      startTimer()
    }
  }

  // ラップ/リセットボタンのハンドラー
  const handleLapReset = () => {
    if (isRunning) {
      recordLap()
    } else if (currentTime > 0) {
      setShowConfirmReset(true)
    }
  }

  // リセット確認のハンドラー
  const handleConfirmReset = () => {
    resetTimer()
    setShowConfirmReset(false)
  }

  // リセットキャンセルのハンドラー
  const handleCancelReset = () => {
    setShowConfirmReset(false)
  }

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleStartStop()
      } else if (e.code === 'KeyL') {
        e.preventDefault()
        if (isRunning) {
          recordLap()
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        if (!isRunning && currentTime > 0) {
          setShowConfirmReset(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, currentTime, recordLap])

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">ストップウォッチ</h1>
      
      {/* 接続状態表示 */}
      <div className="mb-4 flex justify-end">
        <div className="flex items-center">
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '接続中' : 'オフライン'}
          </span>
          {pendingLapTimes.length > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              未同期: {pendingLapTimes.length}
            </span>
          )}
        </div>
      </div>
      
      {/* タイマー表示 */}
      <div className="bg-white p-8 rounded-lg shadow-md mb-8">
        <div className="text-center">
          <div className="text-6xl font-mono font-bold mb-8">
            {formatTime(currentTime)}
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleStartStop}
              className={`px-6 py-3 rounded-md text-white font-medium ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRunning ? 'ストップ' : 'スタート'}
            </button>
            
            <button
              onClick={handleLapReset}
              disabled={!isRunning && currentTime === 0}
              className={`px-6 py-3 rounded-md font-medium ${
                isRunning
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : currentTime > 0
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isRunning ? 'ラップ' : 'リセット'}
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>スペースキー: スタート/ストップ</p>
            <p>Lキー: ラップ</p>
            <p>Rキー: リセット</p>
          </div>
        </div>
      </div>
      
      {/* ラップタイム一覧 */}
      {lapTimes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">ラップタイム</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ラップ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ラップタイム
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    累計タイム
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lapTimes.map((lap, index) => {
                  // 前のラップとの差分を計算
                  const prevLapTime = index > 0 ? lapTimes[index - 1].time : 0
                  const lapDiff = lap.time - prevLapTime
                  
                  return (
                    <tr key={lap.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lapTimes.length - index}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatLapTime(lapDiff)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatLapTime(lap.time)}
                      </td>
                    </tr>
                  )
                }).reverse()}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* リセット確認モーダル */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">タイマーをリセットしますか？</h3>
            <p className="text-gray-600 mb-6">すべてのラップタイムも削除されます。</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StopwatchPage 