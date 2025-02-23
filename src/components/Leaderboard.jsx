import React from 'react'

function Leaderboard({ lapTimes }) {
  const formatTime = (time) => {
    return `${("0" + Math.floor((time / 60000) % 60)).slice(-2)}:${(
      "0" + Math.floor((time / 1000) % 60)
    ).slice(-2)}.${("0" + ((time / 10) % 100)).slice(-2)}`
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">記録</h2>
      <div className="space-y-4">
        {Object.entries(lapTimes).map(([teamId, times]) => (
          <div key={teamId} className="border-b pb-2">
            <h3 className="font-medium">チーム {teamId}</h3>
            <ul className="space-y-1">
              {times.map((lap, index) => (
                <li key={index}>
                  Lap {index + 1}: {formatTime(lap.time)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Leaderboard
