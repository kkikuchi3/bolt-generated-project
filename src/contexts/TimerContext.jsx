import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSocket } from './SocketContext'

const TimerContext = createContext()

export function useTimer() {
  return useContext(TimerContext)
}

export function TimerProvider({ children }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState([])
  const [liveResults, setLiveResults] = useState([])
  const { socket, isConnected } = useSocket()

  // Socket.IOイベントの監視
  useEffect(() => {
    if (!socket) return

    console.log('TimerContext: Setting up socket listeners')

    const handleLiveResults = (data) => {
      console.log('TimerContext: Received live results:', data)
      if (Array.isArray(data)) {
        setLaps(data)
        setLiveResults(data)
      }
    }

    // リスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults)

    // 接続時にデータをリクエスト
    if (isConnected) {
      console.log('TimerContext: Connected to server')
      socket.emit('getLiveResults')
    }

    return () => {
      if (socket) {
        socket.off('liveResultsUpdated', handleLiveResults)
      }
    }
  }, [socket, isConnected])

  // タイマーの更新
  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const value = {
    time,
    setTime,
    isRunning,
    setIsRunning,
    laps,
    setLaps,
    liveResults,
    socket
  }

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
} 