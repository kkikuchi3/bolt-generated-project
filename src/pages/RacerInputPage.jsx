import React, { useState } from 'react'
import RunnerInput from '../components/RunnerInput'
import CurrentRace from '../components/CurrentRace'

function RacerInputPage() {
  const [currentRunner, setCurrentRunner] = useState(null)
  const [nextRunners, setNextRunners] = useState([
    // テスト用のダミーデータ
    {
      id: 1,
      name: "山田太郎",
      bibNumber: "101",
      teamName: "チームA",
      section: 1
    },
    // ... 他のランナー
  ])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">ゼッケン入力</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <CurrentRace currentRunner={currentRunner} />
        <RunnerInput
          onRunnerSelect={setCurrentRunner}
          nextRunners={nextRunners}
        />
      </div>
    </div>
  )
}

export default RacerInputPage 