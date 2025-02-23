import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import TimerPage from './pages/TimerPage'
import TeamManagementPage from './pages/TeamManagementPage'
import RacerInputPage from './pages/RacerInputPage'
import RankingsPage from './pages/RankingsPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<TimerPage />} />
            <Route path="/team-management" element={<TeamManagementPage />} />
            <Route path="/racer-input" element={<RacerInputPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
