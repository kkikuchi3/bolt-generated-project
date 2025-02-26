import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TimerProvider } from './contexts/TimerContext'
import { SocketProvider } from './contexts/SocketContext'
import Navbar from './components/Navbar'
import TimerPage from './pages/TimerPage'
import TeamManagementPage from './pages/TeamManagementPage'
import RacerInputPage from './pages/RacerInputPage'
import RankingsPage from './pages/RankingsPage'
import LiveResultsPage from './pages/LiveResultsPage'

function App() {
  return (
    <SocketProvider>
      <TimerProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-20">
              <Routes>
                <Route path="/" element={<TimerPage />} />
                <Route path="/team-management" element={<TeamManagementPage />} />
                <Route path="/racer-input" element={<RacerInputPage />} />
                <Route path="/rankings" element={<RankingsPage />} />
                <Route path="/live-results" element={<LiveResultsPage />} />
              </Routes>
            </main>
          </div>
        </Router>
      </TimerProvider>
    </SocketProvider>
  )
}

export default App
