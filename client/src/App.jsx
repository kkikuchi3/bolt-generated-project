import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import TimerPage from './pages/TimerPage'
import RankingsPage from './pages/RankingsPage'
import TeamsPage from './pages/TeamsPage'
import LoginPage from './pages/LoginPage'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<TimerPage />} />
                <Route path="/rankings" element={<RankingsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </main>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App 