import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext()

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10

  useEffect(() => {
    console.log('SocketProvider: Initializing socket connection')
    
    // ソケット接続を作成
    const HOST = window.location.hostname
    const PORT = 5000
    
    console.log(`SocketProvider: Connecting to ${HOST}:${PORT}`)
    
    // 新しいSocket.IOインスタンスを作成
    const newSocket = io(`http://${HOST}:${PORT}`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true
    })

    // 接続イベントのハンドラー
    newSocket.on('connect', () => {
      console.log('SocketProvider: Socket connected with ID:', newSocket.id)
      setIsConnected(true)
      reconnectAttempts.current = 0
    })

    // 切断イベントのハンドラー
    newSocket.on('disconnect', (reason) => {
      console.log('SocketProvider: Socket disconnected, reason:', reason)
      setIsConnected(false)
      
      // 自動再接続が失敗した場合は手動で再接続を試みる
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('SocketProvider: Attempting manual reconnection')
        setTimeout(() => {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++
            newSocket.connect()
          }
        }, 1000)
      }
    })

    // 再接続イベントのハンドラー
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('SocketProvider: Socket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
    })

    // 再接続試行イベント
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('SocketProvider: Reconnection attempt:', attemptNumber)
    })

    // 再接続エラー
    newSocket.on('reconnect_error', (error) => {
      console.error('SocketProvider: Reconnection error:', error)
    })

    // 再接続失敗
    newSocket.on('reconnect_failed', () => {
      console.error('SocketProvider: Failed to reconnect')
    })

    // エラーハンドリング
    newSocket.on('error', (error) => {
      console.error('SocketProvider: Socket error:', error)
    })

    // 接続エラー
    newSocket.on('connect_error', (error) => {
      console.error('SocketProvider: Connection error:', error)
    })

    // ソケットをステートに設定
    setSocket(newSocket)

    // コンポーネントのアンマウント時にソケット接続を閉じる
    return () => {
      console.log('SocketProvider: Cleaning up socket connection')
      if (newSocket) {
        newSocket.disconnect()
      }
    }
  }, []) // 空の依存配列で一度だけ実行

  // 接続状態をログ出力
  useEffect(() => {
    console.log('SocketProvider: Connection state changed to:', isConnected)
  }, [isConnected])

  const value = {
    socket,
    isConnected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 