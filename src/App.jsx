import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Stopwatch from './components/Stopwatch'
import TeamManager from './components/TeamManager'
import Leaderboard from './components/Leaderboard'

function App() {
  const [socket, setSocket] = useState(null)
  const [teams, setTeams] = useState([])
  const [lapTimes, setLapTimes] = useState({})

  useEffect(() => {
    const newSocket = io('http://localhost:5000')
    setSocket(newSocket)

    newSocket.on('teamCreated', (team) => {
      setTeams(prev => [...prev, team])
    })

    newSocket.on('lapTimeRecorded', (lapTime) => {
      setLapTimes(prev => ({
        ...prev,
        [lapTime.teamId]: [...(prev[lapTime.teamId] || []), lapTime]
      }))
    })

    return () => newSocket.close()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Relay Stopwatch</h1>
      <div className="grid grid-cols-3 gap-4">
        <TeamManager socket={socket} />
        <Stopwatch socket={socket} teams={teams} />
        <Leaderboard lapTimes={lapTimes} />
      </div>
    </div>
  )
}

export default App
