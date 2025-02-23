import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'

function RankingsPage() {
  const [rankings, setRankings] = useState({
    teams: [],
    individuals: [],
    sections: {}
  })
  const [filter, setFilter] = useState({
    division: 'all',
    section: 'all'
  })
  const { socket } = useSocket()

  useEffect(() => {
    if (socket) {
      socket.on('rankingsUpdated', (newRankings) => {
        setRankings(newRankings)
      })

      // 初期データの取得
      socket.emit('getRankings')

      return () => {
        socket.off('rankingsUpdated')
      }
    }
  }, [socket])

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">順位表</h1>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex space-x-4">
          <select
            value={filter.division}
            onChange={(e) => setFilter(prev => ({ ...prev, division: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">全部門</option>
            <option value="general">一般</option>
            <option value="elementary">小学生</option>
          </select>

          <select
            value={filter.section}
            onChange={(e) => setFilter(prev => ({ ...prev, section: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">順位</th>
                <th className="px-4 py-2 text-left">チーム名</th>
                <th className="px-4 py-2 text-left">部門</th>
                <th className="px-4 py-2 text-left">総合タイム</th>
                <th className="px-4 py-2 text-left">差</th>
              </tr>
            </thead>
            <tbody>
              {rankings.teams
                .filter(team => filter.division === 'all' || team.division === filter.division)
                .map((team, index) => (
                  <tr key={team.id} className="border-t">
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{team.name}</td>
                    <td className="px-4 py-2">
                      {team.division === 'general' ? '一般' : '小学生'}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {formatTime(team.totalTime)}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {index === 0 ? '-' : formatTime(team.totalTime - rankings.teams[0].totalTime)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 区間賞 */}
      {filter.section !== 'all' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">{filter.section}区 区間賞</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">順位</th>
                  <th className="px-4 py-2 text-left">選手名</th>
                  <th className="px-4 py-2 text-left">チーム名</th>
                  <th className="px-4 py-2 text-left">タイム</th>
                </tr>
              </thead>
              <tbody>
                {rankings.sections[filter.section]?.map((runner, index) => (
                  <tr key={runner.id} className="border-t">
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{runner.name}</td>
                    <td className="px-4 py-2">{runner.teamName}</td>
                    <td className="px-4 py-2 font-mono">
                      {formatTime(runner.time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default RankingsPage 