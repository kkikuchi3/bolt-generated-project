import React from 'react'
import Timer from '../components/Timer'

function TimerPage() {
  const handleRecordTime = (lapData) => {
    // ラップタイムの記録処理
    console.log('Recorded lap:', lapData)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">ストップウォッチ</h1>
      <Timer onRecord={handleRecordTime} />
    </div>
  )
}

export default TimerPage 