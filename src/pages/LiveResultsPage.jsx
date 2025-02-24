import React from 'react'
import LiveResults from '../components/LiveResults'

function LiveResultsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">リアルタイム結果</h1>
      <LiveResults />
    </div>
  )
}

export default LiveResultsPage 