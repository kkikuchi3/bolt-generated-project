import React, { createContext, useContext, useState, useEffect } from 'react'
import io from 'socket.io-client'

const TimerContext = createContext()
// 環境変数またはwindowのロケーションからホストIPを取得
const HOST = window.location.hostname
const socket = io(`http://${HOST}:5000`)

export function useTimer() {
  return useContext(TimerContext)
}

export function TimerProvider({ children }) {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState([])
  const [liveResults, setLiveResults] = useState([])

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

  // Socket.IOイベントの監視
  useEffect(() => {
    console.log('TimerContext: Setting up socket listeners')
    
    socket.emit('getLiveResults')

    socket.on('connect', () => {
      console.log('TimerContext: Connected to server')
      socket.emit('getLiveResults')
    })

    socket.on('disconnect', () => {
      console.log('TimerContext: Disconnected from server')
    })

    socket.on('liveResultsUpdated', (updatedLaps) => {
      console.log('TimerContext: Received updated laps:', updatedLaps)
      if (Array.isArray(updatedLaps)) {
        setLaps(updatedLaps)
        setLiveResults(updatedLaps)
      }
    })

    return () => {
      console.log('TimerContext: Cleaning up socket listeners')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('liveResultsUpdated')
    }
  }, [])

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