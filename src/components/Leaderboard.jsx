import React from 'react'

function Leaderboard({ lapTimes }) {
  const calculateTeamRankings = () => {
    const teamRankings = Object.entries(lapTimes)
      .map(([teamId, times]) => ({
        teamId,
        totalTime: times.reduce((sum, lap) => sum + lap.time, 0)
      }))
      .sort((a, b) => a.totalTime - b.totalTime)

    return teamRankings
  }

  const rankings = calculateTeamRankings()

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100">
            <th>Rank</th>
            <th>Team</th>
            <th>Total Time</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((team, index) => (
            <tr 
              key={team.teamId} 
              className={`
                ${index === 0 ? 'bg-yellow-100' : 
                  index === 1 ? 'bg-gray-100' : 
                  index === 2 ? 'bg-orange-100' : ''}
              `}
            >
              <td className="text-center">{index + 1}</td>
              <td className="text-center">{team.teamId}</td>
              <td className="text-center">{formatTime(team.totalTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default Leaderboard
