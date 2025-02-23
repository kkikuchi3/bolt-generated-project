import React, { useState, useEffect } from 'react'
import Timer from '../components/Timer'
import RunnerInput from '../components/RunnerInput'
import CurrentRace from '../components/CurrentRace'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

function TimerPage() {
  const [currentRunner, setCurrentRunner] = useState(null)
  const [nextRunners, setNextRunners] = useState([])
  const { socket } = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    if (socket) {
      socket.emit('getNextRunners')
      socket.on('nextRunnersUpdated', (runners) => {
        setNextRunners(runners)
      })
    }
  }, [socket])

  const handleRecordTime = (lapData) => {
    if (currentRunner && socket) {
      socket.emit('recordTime', {
        runnerId: currentRunner.id,
        bibNumber: currentRunner.bibNumber,
        teamId: currentRunner.teamId,
        section: currentRunner.section,
        lapNumber: lapData.number,
        splitTime: lapData.splitTime,
        totalTime: lapData.totalTime,
        timestamp: lapData.timestamp,
        recordedBy: user.id
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側: 次走者リスト */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">次走者リスト</h2>
            <div className="space-y-4">
              {nextRunners.map((runner, index) => (
                <div
                  key={runner.id}
                  className={`p-4 rounded-lg border ${
                    index === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{runner.name}</div>
                  <div className="text-sm text-gray-600">
                    ゼッケン: {runner.bibNumber} / {runner.section}区
                  </div>
                  <div className="text-sm text-gray-600">
                    チーム: {runner.teamName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中央: タイマー */}
        <div className="lg:col-span-1">
          <Timer onRecord={handleRecordTime} />
        </div>

        {/* 右側: 現在の走者と入力 */}
        <div className="lg:col-span-1 space-y-6">
          <CurrentRace currentRunner={currentRunner} />
          <RunnerInput
            onRunnerSelect={setCurrentRunner}
            nextRunners={nextRunners}
          />
        </div>
      </div>
    </div>
  )
}

export default TimerPage 