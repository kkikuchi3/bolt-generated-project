import React, { useState, useEffect } from 'react'

function Stopwatch({ socket, teams }) {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState('')

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => {
        setTime((time) => time + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
    if (socket && selectedTeam) {
      socket.emit('recordLapTime', {
        teamId: selectedTeam,
        time: time
      })
    }
    setTime(0)
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">ストップウォッチ</h2>
      <div className="text-4xl font-mono text-center mb-4">
        {("0" + Math.floor((time / 60000) % 60)).slice(-2)}:
        {("0" + Math.floor((time / 1000) % 60)).slice(-2)}.
        {("0" + ((time / 10) % 100)).slice(-2)}
      </div>
      <select
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="">チームを選択</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <div className="space-x-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            スタート
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            ストップ
          </button>
        )}
      </div>
    </div>
  )
}

export default Stopwatch
