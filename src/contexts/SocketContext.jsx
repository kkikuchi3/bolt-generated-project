import React, { createContext, useContext } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext()
const HOST = window.location.hostname
const socket = io(`http://${HOST}:5000`)

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const value = {
    socket
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 