import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

function TeamsPage() {
  const [teams, setTeams] = useState([])
  const [newTeam, setNewTeam] = useState({
    name: '',
    division: 'general', // 'general' or 'elementary'
    members: []
  })
  const [newMember, setNewMember] = useState({
    name: '',
    bibNumber: '',
    section: 1, // 区間
    order: 1    // 走順
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/teams', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      const data = await response.json()
      setTeams(data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const handleTeamSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(newTeam)
      })
      if (response.ok) {
        fetchTeams()
        setNewTeam({ name: '', division: 'general', members: [] })
      }
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const handleAddMember = () => {
    setNewTeam(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }))
    setNewMember({
      name: '',
      bibNumber: '',
      section: 1,
      order: prev.members.length + 1
    })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">チーム管理</h1>

      {/* チーム登録フォーム */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">新規チーム登録</h2>
        <form onSubmit={handleTeamSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              チーム名
            </label>
            <input
              type="text"
              value={newTeam.name}
              onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setNewTeam(prev => ({ ...prev, division: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="general">一般</option>
              <option value="elementary">小学生</option>
            </select>
          </div>

          {/* メンバー追加フォーム */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">メンバー追加</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={newMember.name}
                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="名前"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newMember.bibNumber}
                onChange={(e) => setNewMember(prev => ({ ...prev, bibNumber: e.target.value }))}
                placeholder="ゼッケン番号"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <select
                value={newMember.section}
                onChange={(e) => setNewMember(prev => ({ ...prev, section: parseInt(e.target.value) }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}区</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                メンバー追加
              </button>
            </div>
          </div>

          {/* 登録済みメンバーリスト */}
          {newTeam.members.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">登録済みメンバー</h4>
              <ul className="space-y-2">
                {newTeam.members.map((member, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{member.name} - {member.bibNumber} - {member.section}区</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTeam(prev => ({
                          ...prev,
                          members: prev.members.filter((_, i) => i !== index)
                        }))
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            チームを登録
          </button>
        </form>
      </div>

      {/* チーム一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">登録チーム一覧</h2>
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="border rounded p-4">
              <h3 className="text-lg font-medium">{team.name}</h3>
              <p className="text-sm text-gray-500">部門: {team.division === 'general' ? '一般' : '小学生'}</p>
              <div className="mt-2">
                <h4 className="text-sm font-medium">メンバー</h4>
                <ul className="mt-1 space-y-1">
                  {team.members.map(member => (
                    <li key={member.id} className="text-sm">
                      {member.name} - {member.bibNumber} - {member.section}区
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TeamsPage 