import React, { useState, useEffect, useCallback } from 'react'

function Timer({ onRecord }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState([])
  const [lastLapTime, setLastLapTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleStart = () => {
    setIsRunning(true)
    setLastLapTime(time)
  }

  const handleStop = () => {
    setIsRunning(false)
    // 最終ラップを記録
    if (time > lastLapTime) {
      handleLap()
    }
  }

  const handleReset = () => {
    setTime(0)
    setLaps([])
    setLastLapTime(0)
    setIsRunning(false)
  }

  const handleLap = useCallback(() => {
    const lapNumber = laps.length + 1
    const newLap = {
      number: lapNumber,
      totalTime: Math.floor(time / 1000) * 1000, // ミリ秒以下を切り捨て
      timestamp: currentTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }

    setLaps(prevLaps => [...prevLaps, newLap])
    onRecord(newLap)
  }, [time, laps.length, currentTime, onRecord])

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
      {/* 現在時刻 */}
      <div className="absolute top-2 right-4">
        <div className="text-2xl font-mono text-gray-600">
          {formatCurrentTime(currentTime)}
        </div>
      </div>

      {/* メインタイマー */}
      <div className="text-6xl md:text-7xl font-mono text-center mb-12 tabular-nums tracking-tight pt-8">
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