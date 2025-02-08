import React, { useState, useEffect } from 'react'

function Stopwatch({ socket, teams }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [lapTimes, setLapTimes] = useState([])
  const [lastLapTime, setLastLapTime] = useState(0)

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setTime(0)
    setLapTimes([])
    setLastLapTime(0)
    setIsRunning(false)
  }

  const recordLap = () => {
    if (!selectedTeam) {
      alert('チームを選択してください')
      return
    }

    // 現在のラップタイムを計算
    const currentLapTime = time - lastLapTime

    const lapTime = {
      teamId: selectedTeam,
      totalTime: time,
      lapTime: currentLapTime,
      timestamp: new Date().toISOString()
    }

    // ソケットでラップタイムを送信
    socket.emit('recordLapTime', lapTime)

    // ラップタイムリストを更新
    setLapTimes(prevLaps => [...prevLaps, lapTime])

    // 最後のラップタイムを更新
    setLastLapTime(time)
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-4xl font-bold mb-4">
        {formatTime(time)}
      </div>
      <select 
        value={selectedTeam || ''}
        onChange={(e) => setSelectedTeam(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      >
        <option value="">チームを選択</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={handleStart} 
          className="bg-green-500 text-white p-2 rounded"
        >
          開始
        </button>
        <button 
          onClick={handleStop} 
          className="bg-red-500 text-white p-2 rounded"
        >
          停止
        </button>
        <button 
          onClick={handleReset} 
          className="bg-gray-500 text-white p-2 rounded"
        >
          リセット
        </button>
        <button 
          onClick={recordLap} 
          className="col-span-3 bg-blue-500 text-white p-2 rounded"
        >
          ラップ記録
        </button>
      </div>

      {/* ラップタイム表示 */}
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">ラップタイム</h3>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">ラップ</th>
              <th className="border p-2">ラップタイム</th>
              <th className="border p-2">合計タイム</th>
            </tr>
          </thead>
          <tbody>
            {lapTimes.map((lap, index) => (
              <tr key={index}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2 text-center">{formatTime(lap.lapTime)}</td>
                <td className="border p-2 text-center">{formatTime(lap.totalTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatTime(time) {
  const minutes = Math.floor(time / 60000)
  const seconds = Math.floor((time % 60000) / 1000)
  const milliseconds = time % 1000

  return `${minutes.toString().padStart(2, '0')}:
           ${seconds.toString().padStart(2, '0')}.
           ${milliseconds.toString().padStart(3, '0')}`
}

export default Stopwatch
