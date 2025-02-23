import React, { useState } from 'react'

function TeamManager({ socket }) {
  const [teamName, setTeamName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (socket && teamName.trim()) {
      socket.emit('createTeam', { name: teamName })
      setTeamName('')
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">チーム管理</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="チーム名"
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          チームを追加
        </button>
      </form>
    </div>
  )
}

export default TeamManager
