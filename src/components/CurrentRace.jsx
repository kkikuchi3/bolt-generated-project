import React from 'react'

function CurrentRace({ currentRunner }) {
  if (!currentRunner) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">現在の走者</h2>
        <div className="text-center text-gray-500 py-8">
          走者が選択されていません
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">現在の走者</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ゼッケン番号</p>
              <p className="text-2xl font-bold">{currentRunner.bibNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">区間</p>
              <p className="text-2xl font-bold">{currentRunner.section}区</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">名前</p>
            <p className="text-xl">{currentRunner.name}</p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">チーム</p>
            <p className="text-xl">{currentRunner.teamName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CurrentRace 