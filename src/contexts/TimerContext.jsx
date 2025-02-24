import React, { createContext, useContext, useState, useEffect } from 'react'
import io from 'socket.io-client'

const TimerContext = createContext()
const socket = io('http://localhost:5000')

export function useTimer() {
  return useContext(TimerContext)
}

export function TimerProvider({ children }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState([])

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

  // サーバーからの初期データ受信
  useEffect(() => {
    socket.on('initialLapTimes', (initialLaps) => {
      setLaps(initialLaps)
    })

    // ラップタイムの更新を受信
    socket.on('lapTimeUpdated', (updatedLaps) => {
      setLaps(updatedLaps)
    })

    return () => {
      socket.off('initialLapTimes')
      socket.off('lapTimeUpdated')
    }
  }, [])

  const value = {
    time,
    setTime,
    isRunning,
    setIsRunning,
    laps,
    setLaps,
    socket
  }

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
} 