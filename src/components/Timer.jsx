import React, { useCallback, useState, useEffect } from 'react'
import { useTimer } from '../contexts/TimerContext'

function Timer({ onRecord }) {
  const { 
    time, 
    isRunning, 
    laps, 
    setLaps, 
    socket,
    startTimer,
    stopTimer,
    resetTimer
  } = useTimer()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gamepad, setGamepad] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // ゲームパッドの接続監視
  useEffect(() => {
    const handleGamepadConnected = (e) => {
      console.log("Gamepad connected:", e.gamepad)
      setGamepad(e.gamepad)
    }

    const handleGamepadDisconnected = () => {
      console.log("Gamepad disconnected")
      setGamepad(null)
    }

    window.addEventListener("gamepadconnected", handleGamepadConnected)
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected)

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected)
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected)
    }
  }, [])

  const recordLap = useCallback(() => {
    // コンマ以下を切り捨てたタイム（ミリ秒単位で1000で割って切り捨て、また1000をかける）
    const truncatedTime = Math.floor(time / 1000) * 1000
    
    const lapNumber = laps.length + 1
    const newLap = {
      number: lapNumber,
      total_time: truncatedTime,
      timestamp: currentTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }

    console.log('Recording lap:', newLap)
    
    // socketが存在する場合のみemitを実行
    if (socket) {
      socket.emit('recordLap', newLap)
    }

    setLaps(prevLaps => [...prevLaps, newLap])
    
    // onRecordが存在する場合のみ呼び出し
    if (onRecord) {
      onRecord(newLap)
    }
  }, [time, laps.length, currentTime, socket, setLaps, onRecord])

  const handleStart = useCallback(() => {
    startTimer()
  }, [startTimer])

  const handleStop = useCallback(() => {
    stopTimer()
    recordLap()
  }, [stopTimer, recordLap])

  const handleReset = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  const handleLap = useCallback(() => {
    if (isRunning) {
      recordLap()
    }
  }, [isRunning, recordLap])

  // 時間表示のフォーマット (00:00:00.00形式)
  const formatTime = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  // ラップタイム表示のフォーマット (00:00:00形式 - コンマ以下切り捨て)
  const formatLapTime = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isRunning) {
          handleStop()
        } else {
          handleStart()
        }
      } else if (e.code === 'KeyL' && isRunning) {
        e.preventDefault()
        handleLap()
      } else if (e.code === 'KeyR' && !isRunning && time > 0) {
        e.preventDefault()
        handleReset()
      } else if (e.code === 'KeyH') {
        e.preventDefault()
        setShowHelp(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRunning, time, handleStart, handleStop, handleLap, handleReset])

  // ゲームパッドの状態を監視
  useEffect(() => {
    if (!gamepad) return

    let animationId
    let lastButtonState = {}

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads()
      const gp = gamepads[gamepad.index]
      
      if (!gp) return
      
      // Aボタン (0) - スタート/ストップ
      if (gp.buttons[0].pressed && !lastButtonState[0]) {
        if (isRunning) {
          handleStop()
        } else {
          handleStart()
        }
      }
      
      // Bボタン (1) - ラップ
      if (gp.buttons[1].pressed && !lastButtonState[1] && isRunning) {
        handleLap()
      }
      
      // Xボタン (2) - リセット
      if (gp.buttons[2].pressed && !lastButtonState[2] && !isRunning && time > 0) {
        handleReset()
      }
      
      // ボタンの状態を保存
      for (let i = 0; i < gp.buttons.length; i++) {
        lastButtonState[i] = gp.buttons[i].pressed
      }
      
      animationId = requestAnimationFrame(checkGamepad)
    }
    
    animationId = requestAnimationFrame(checkGamepad)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [gamepad, isRunning, time, handleStart, handleStop, handleLap, handleReset])

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* ヘルプモーダル */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">キーボードショートカット</h3>
            <ul className="space-y-2">
              <li><span className="font-mono bg-gray-100 px-2 py-1 rounded">Space</span> - スタート/ストップ</li>
              <li><span className="font-mono bg-gray-100 px-2 py-1 rounded">L</span> - ラップを記録</li>
              <li><span className="font-mono bg-gray-100 px-2 py-1 rounded">R</span> - リセット</li>
              <li><span className="font-mono bg-gray-100 px-2 py-1 rounded">H</span> - ヘルプを表示/非表示</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">ストップウォッチ</h2>
        <button
          onClick={() => setShowHelp(true)}
          className="text-gray-500 hover:text-gray-700"
          title="ヘルプを表示"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* タイマー表示 */}
      <div className="text-center mb-6">
        <div className="text-4xl xs:text-5xl sm:text-6xl font-mono font-semibold tracking-wider overflow-x-auto whitespace-nowrap">
          {formatTime(time)}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          現在時刻: {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* コントロールボタン */}
      <div className="grid grid-cols-1 gap-4">
        {/* ラップボタン */}
        <div className="flex justify-center mb-2">
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className={`w-full max-w-xs py-2 sm:py-3 text-white text-base rounded-lg font-medium ${
              isRunning
                ? 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            ラップ
          </button>
        </div>

        {/* スタート/ストップとリセットボタン */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`py-3 sm:py-4 text-white text-base sm:text-lg rounded-lg font-medium ${
              !isRunning
                ? 'bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                : 'bg-red-500 hover:bg-red-600 focus:ring-2 focus:ring-red-500'
            }`}
          >
            {!isRunning ? 'スタート' : 'ストップ'}
          </button>

          <button
            onClick={handleReset}
            disabled={time === 0 || isRunning}
            className={`py-3 sm:py-4 text-white text-base sm:text-lg rounded-lg font-medium ${
              time > 0 && !isRunning
                ? 'bg-gray-500 hover:bg-gray-600 focus:ring-2 focus:ring-gray-500'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            リセット
          </button>
        </div>
      </div>

      {/* ラップタイム表示 */}
      {laps.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">記録</h3>
          <div className="overflow-auto max-h-48 sm:max-h-64">
            <table className="min-w-full text-sm sm:text-base">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 sm:px-4 py-2 text-left">No.</th>
                  <th className="px-3 sm:px-4 py-2 text-left">累計タイム</th>
                  <th className="px-3 sm:px-4 py-2 text-left">記録時刻</th>
                </tr>
              </thead>
              <tbody>
                {[...laps].reverse().map((lap) => (
                  <tr key={lap.number} className="border-t">
                    <td className="px-3 sm:px-4 py-2">{lap.number}</td>
                    <td className="px-3 sm:px-4 py-2 font-mono">
                      {formatLapTime(lap.total_time)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 font-mono">
                      {lap.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timer 