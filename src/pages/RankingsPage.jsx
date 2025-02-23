import React, { useState } from 'react'

function RankingsPage() {
  const [filter, setFilter] = useState({
    division: 'all',
    section: 'all'
  })

  // ダミーデータ
  const rankings = {
    teams: [
      {
        id: 1,
        name: 'チームA',
        division: 'general',
        totalTime: 3600000, // 1時間
      },
      {
        id: 2,
        name: 'チームB',
        division: 'elementary',
        totalTime: 3660000, // 1時間1分
      }
    ]
  }

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">順位表</h1>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <div className="flex space-x-4">
          <select
            value={filter.division}
            onChange={(e) => setFilter(prev => ({ ...prev, division: e.target.value }))}
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全部門</option>
            <option value="general">一般</option>
            <option value="elementary">小学生</option>
          </select>

          <select
            value={filter.section}
            onChange={(e) => setFilter(prev => ({ ...prev, section: e.target.value }))}
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全区間</option>
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}区</option>
            ))}
          </select>
        </div>
      </div>

      {/* チーム総合順位 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">チーム総合順位</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">チーム名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部門</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">総合タイム</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">差</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankings.teams
                .filter(team => filter.division === 'all' || team.division === filter.division)
                .map((team, index) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{team.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {team.division === 'general' ? '一般' : '小学生'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                      {formatTime(team.totalTime)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                      {index === 0 ? '-' : formatTime(team.totalTime - rankings.teams[0].totalTime)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RankingsPage 