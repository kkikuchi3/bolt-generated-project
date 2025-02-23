import React, { useState, useEffect, useCallback } from 'react'

function Timer({ onRecord }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState([])
  const [lastLapTime, setLastLapTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let interval
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  const handleStart = () => {
    if (isPaused) {
      setIsPaused(false)
    } else {
      setIsRunning(true)
      setLastLapTime(0)
    }
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
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
    setIsPaused(false)
  }
  
  const handleLap = useCallback(() => {
    const currentLapTime = time - lastLapTime
    const lapNumber = laps.length + 1
    const newLap = {
      number: lapNumber,
      totalTime: time,
      splitTime: currentLapTime,
      timestamp: new Date().toISOString()
    }
    
    setLaps(prevLaps => [...prevLaps, newLap])
    setLastLapTime(time)
    onRecord(newLap)
  }, [time, lastLapTime, laps.length, onRecord])

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-6xl font-mono text-center mb-8">
        {formatTime(time)}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="col-span-2 flex justify-center space-x-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-32 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
            >
              スタート
            </button>
          ) : isPaused ? (
            <button
              onClick={handleStart}
              className="w-32 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
            >
              再開
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-32 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-medium"
            >
              一時停止
            </button>
          )}
          
          {isRunning && (
            <button
              onClick={handleStop}
              className="w-32 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            >
              ストップ
            </button>
          )}
        </div>

        <div className="col-span-2 flex justify-center space-x-4">
          {isRunning && !isPaused && (
            <button
              onClick={handleLap}
              className="w-32 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              ラップ
            </button>
          )}
          
          {(time > 0 && !isRunning) && (
            <button
              onClick={handleReset}
              className="w-32 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {laps.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">ラップタイム</h3>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">周回</th>
                  <th className="px-4 py-2 text-left">ラップ</th>
                  <th className="px-4 py-2 text-left">累計</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap) => (
                  <tr key={lap.number} className="border-t">
                    <td className="px-4 py-2">{lap.number}</td>
                    <td className="px-4 py-2 font-mono">
                      {formatTime(lap.splitTime)}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {formatTime(lap.totalTime)}
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