import React, { useState } from 'react'

function RunnerInput({ onRunnerSelect, nextRunners }) {
  const [bibNumber, setBibNumber] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // 次走者リストから該当する走者を探す
    const runner = nextRunners.find(r => r.bibNumber === bibNumber)
    if (runner) {
      onRunnerSelect(runner)
      setBibNumber('')
    } else {
      setError('該当する走者が見つかりません')
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">走者入力</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bibNumber" className="block text-sm font-medium text-gray-700">
            ゼッケン番号
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="bibNumber"
              value={bibNumber}
              onChange={(e) => setBibNumber(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="例: 123"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            確定
          </button>
        </div>
      </form>

      {/* クイック選択 */}
      {nextRunners.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            次走者クイック選択
          </h3>
          <div className="space-y-2">
            {nextRunners.slice(0, 3).map(runner => (
              <button
                key={runner.id}
                onClick={() => {
                  onRunnerSelect(runner)
                  setBibNumber('')
                }}
                className="w-full text-left px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                <div className="font-medium">{runner.name}</div>
                <div className="text-sm text-gray-600">
                  ゼッケン: {runner.bibNumber} / チーム: {runner.teamName}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RunnerInput 