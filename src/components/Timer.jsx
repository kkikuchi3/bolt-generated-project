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
    socket  // TimerContextからsocketを取得
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
      id: Date.now(),
      number: lapNumber,
      totalTime: Math.floor(time / 1000) * 1000,
      timestamp: currentTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }

    setLaps(prevLaps => [...prevLaps, newLap])
    socket.emit('recordLap', newLap)
  }, [time, laps.length, currentTime, socket, setLaps])

  const handleStart = useCallback(() => {
    setIsRunning(true)
  }, [setIsRunning])

  const handleStop = useCallback(() => {
    if (isRunning) {
      recordLap()
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
    localStorage.removeItem('timerLaps')
    localStorage.removeItem('unsyncedLaps')
    setIsRunning(false)
  }, [setTime, setLaps, setIsRunning])

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
    <div className="bg-white p-6 rounded-lg shadow-md relative">
      {/* ヘルプボタン */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="absolute top-2 left-4 text-gray-500 hover:text-gray-700"
      >
        {showHelp ? '❌' : '❔'}
      </button>

      {/* 操作方法の説明 (表示・非表示切り替え) */}
      {showHelp && (
        <div className="absolute top-12 left-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg z-10">
          <div className="text-sm text-gray-600 space-y-2">
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
      <div className="absolute top-2 right-4">
        <div className="text-2xl font-mono text-gray-600">
          {formatCurrentTime(currentTime)}
        </div>
      </div>

      {/* メインタイマー */}
      <div className="text-6xl md:text-7xl font-mono text-center mb-12 tabular-nums tracking-tight pt-16">
        {formatDisplayTime(time)}
      </div>

      {/* ボタン類 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="col-span-2 flex justify-center space-x-4">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`w-40 py-4 text-white text-lg rounded-lg font-medium ${
              !isRunning
                ? 'bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                : 'bg-red-500 hover:bg-red-600 focus:ring-2 focus:ring-red-500'
            }`}
          >
            {!isRunning ? 'スタート' : 'ストップ'}
          </button>
        </div>

        <div className="col-span-2 flex justify-center space-x-4">
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className={`w-40 py-4 text-white text-lg rounded-lg font-medium ${
              isRunning
                ? 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            ラップ
          </button>

          <button
            onClick={handleReset}
            disabled={time === 0 || isRunning}
            className={`w-40 py-4 text-white text-lg rounded-lg font-medium ${
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
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">記録</h3>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">No.</th>
                  <th className="px-4 py-2 text-left">累計タイム</th>
                  <th className="px-4 py-2 text-left">記録時刻</th>
                </tr>
              </thead>
              <tbody>
                {[...laps].reverse().map((lap) => (
                  <tr key={lap.number} className="border-t">
                    <td className="px-4 py-2">{lap.number}</td>
                    <td className="px-4 py-2 font-mono">
                      {formatLapTime(lap.totalTime)}
                    </td>
                    <td className="px-4 py-2 font-mono">
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