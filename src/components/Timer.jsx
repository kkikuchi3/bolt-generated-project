import React, { useCallback, useState, useEffect } from 'react'
import { useTimer } from '../contexts/TimerContext'

function Timer({ onRecord }) {
  const { 
    time, 
    setTime,
    isRunning, 
    setIsRunning, 
    laps, 
    setLaps, 
    socket
  } = useTimer()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gamepad, setGamepad] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

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
    const lapNumber = laps.length + 1
    const newLap = {
      number: lapNumber,
      total_time: time,
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
    setIsRunning(true)
  }, [setIsRunning])

  const handleStop = useCallback(() => {
    if (isRunning) {
      recordLap() // 停止時にラップを記録
      setIsRunning(false)
    }
  }, [isRunning, recordLap, setIsRunning])

  const handleLap = useCallback(() => {
    if (isRunning) {
      recordLap()
    }
  }, [isRunning, recordLap])

  const handleReset = useCallback(() => {
    setTime(0)
    setLaps([])
    // サーバーにリセット要求を送信（socketが存在する場合のみ）
    if (socket) {
      socket.emit('resetTimer')
    }
  }, [setTime, setLaps, socket])

  // ゲームパッドの入力監視
  useEffect(() => {
    let animationFrameId
    let lastPressTime = 0
    const DEBOUNCE_TIME = 300 // ボタン連打防止用

    const checkGamepadInput = () => {
      const gamepads = navigator.getGamepads()
      const activeGamepad = gamepads[0]
      const currentTime = Date.now()

      if (activeGamepad) {
        if (currentTime - lastPressTime > DEBOUNCE_TIME) {
          // Aボタン (0) でスタート/ストップ
          if (activeGamepad.buttons[0].pressed) {
            lastPressTime = currentTime
            if (!isRunning) handleStart()
            else handleStop()
          }
          // Bボタン (1) でラップ
          if (activeGamepad.buttons[1].pressed && isRunning) {
            lastPressTime = currentTime
            handleLap()
          }
          // Xボタン (2) でリセット
          if (activeGamepad.buttons[2].pressed && !isRunning && time > 0) {
            lastPressTime = currentTime
            handleReset()
          }
        }
      }

      animationFrameId = requestAnimationFrame(checkGamepadInput)
    }

    if (gamepad) {
      checkGamepadInput()
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [gamepad, isRunning, time, handleStart, handleStop, handleLap, handleReset])

  // キーボード入力の監視
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (!isRunning) handleStart()
          else handleStop()
          break
        case 'Enter':
          e.preventDefault()
          if (isRunning) handleLap()
          break
        case 'KeyR':
          e.preventDefault()
          if (!isRunning && time > 0) handleReset()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isRunning, time, handleStart, handleStop, handleLap, handleReset])

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDisplayTime = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  const formatLapTime = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatCurrentTime = (date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md relative">
      {/* ヘルプボタン */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="absolute top-2 left-2 sm:left-4 text-gray-500 hover:text-gray-700 p-2"
      >
        {showHelp ? '❌' : '❔'}
      </button>

      {/* 操作方法の説明 */}
      {showHelp && (
        <div className="absolute top-12 left-2 sm:left-4 bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-lg z-10 text-xs sm:text-sm">
          <div className="text-gray-600 space-y-1 sm:space-y-2">
            <div>スペース / Aボタン: スタート/ストップ</div>
            <div>Enter / Bボタン: ラップ</div>
            <div>R / Xボタン: リセット</div>
            <div className="pt-2 border-t border-gray-200">
              {gamepad ? (
                <span className="text-green-600">🎮 コントローラー接続中</span>
              ) : (
                <span className="text-gray-400">🎮 コントローラー未接続</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 現在時刻 */}
      <div className="absolute top-2 right-2 sm:right-4">
        <div className="text-xl sm:text-2xl font-mono text-gray-600">
          {formatCurrentTime(currentTime)}
        </div>
      </div>

      {/* メインタイマー */}
      <div className="text-5xl sm:text-6xl md:text-7xl font-mono text-center mb-8 sm:mb-12 tabular-nums tracking-tight pt-12 sm:pt-16">
        {formatDisplayTime(time)}
      </div>

      {/* ボタン類 */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* ラップボタン */}
        <div className="flex justify-center">
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className={`w-full sm:w-64 py-4 sm:py-5 text-white text-lg sm:text-xl rounded-lg font-medium ${
              isRunning
                ? 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            ラップ
          </button>
        </div>

        {/* スタート/ストップとリセットボタン */}
        <div className="flex justify-center space-x-3 sm:space-x-4">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`w-full sm:w-40 py-3 sm:py-4 text-white text-base sm:text-lg rounded-lg font-medium ${
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
            className={`w-full sm:w-40 py-3 sm:py-4 text-white text-base sm:text-lg rounded-lg font-medium ${
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