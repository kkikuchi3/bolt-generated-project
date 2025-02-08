import React, { useState } from 'react'

function TeamManager({ socket }) {
  const [teamName, setTeamName] = useState('')

  const createTeam = () => {
    if (!teamName.trim()) return

    const newTeam = {
      id: Date.now().toString(),
      name: teamName
    }

    socket.emit('createTeam', newTeam)
    setTeamName('')
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Team Management</h2>
      <div className="flex">
        <input 
          type="text" 
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team Name" 
          className="flex-grow p-2 border rounded-l"
        />
        <button 
          onClick={createTeam}
          className="bg-blue-500 text-white p-2 rounded-r"
        >
          Create Team
        </button>
      </div>
    </div>
  )
}

export default TeamManager
