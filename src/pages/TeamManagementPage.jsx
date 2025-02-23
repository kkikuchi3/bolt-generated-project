import React, { useState } from 'react'

function TeamManagementPage() {
  const [teams, setTeams] = useState([])
  const [newTeam, setNewTeam] = useState({
    name: '',
    division: 'general',
    members: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setTeams([...teams, { ...newTeam, id: Date.now() }])
    setNewTeam({ name: '', division: 'general', members: [] })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">チーム管理</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">新規チーム登録</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              チーム名
            </label>
            <input
              type="text"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              部門
            </label>
            <select
              value={newTeam.division}
              onChange={(e) => setNewTeam({ ...newTeam, division: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="general">一般</option>
              <option value="elementary">小学生</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            チームを登録
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">登録チーム一覧</h2>
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="border rounded p-4">
              <h3 className="text-lg font-medium">{team.name}</h3>
              <p className="text-sm text-gray-500">
                部門: {team.division === 'general' ? '一般' : '小学生'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TeamManagementPage 