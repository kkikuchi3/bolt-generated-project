import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
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
  const [startTime, setStartTime] = useState(null)
  const [resultsCleared, setResultsCleared] = useState(false)
  const [clearId, setClearId] = useState(0)
  const { socket, isConnected } = useSocket()
  const initialized = useRef(false)
  const resetAttempted = useRef(false)
  const clearConfirmed = useRef(false)

  // ローカルストレージから状態を復元（初回のみ）
  useEffect(() => {
    if (initialized.current) return;
    
    try {
      const savedState = localStorage.getItem('timerState')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        
        console.log('TimerContext: Restoring state from localStorage', parsedState);
        
        // 保存された時間から経過時間を計算
        if (parsedState.isRunning && parsedState.startTime) {
          const elapsedSinceLastSave = Date.now() - parsedState.lastSaved;
          const newTime = parsedState.time + elapsedSinceLastSave;
          const newStartTime = Date.now() - newTime;
          
          console.log('TimerContext: Resuming timer', {
            elapsedSinceLastSave,
            newTime,
            newStartTime
          });
          
          setTime(newTime);
          setStartTime(newStartTime);
          setIsRunning(true);
        } else {
          setTime(parsedState.time || 0);
          setIsRunning(false);
        }
        
        if (parsedState.laps && Array.isArray(parsedState.laps)) {
          setLaps(parsedState.laps);
        }
        
        if (parsedState.resultsCleared) {
          setResultsCleared(true);
          resetAttempted.current = true;
        }
        
        if (parsedState.clearId) {
          setClearId(parsedState.clearId);
        }
      }
    } catch (error) {
      console.error('TimerContext: Error restoring state from localStorage', error);
    }
    
    initialized.current = true;
  }, []);

  // 状態をローカルストレージに保存
  useEffect(() => {
    // 初期化前は保存しない
    if (!initialized.current) return;
    
    try {
      const state = {
        time,
        isRunning,
        laps,
        startTime,
        resultsCleared,
        clearId,
        lastSaved: Date.now()
      };
      
      localStorage.setItem('timerState', JSON.stringify(state));
      console.log('TimerContext: Saved state to localStorage', state);
    } catch (error) {
      console.error('TimerContext: Error saving state to localStorage', error);
    }
  }, [time, isRunning, laps, startTime, resultsCleared, clearId]);

  // Socket.IOイベントの監視
  useEffect(() => {
    if (!socket) return;

    console.log('TimerContext: Setting up socket listeners');

    const handleLiveResults = (data) => {
      console.log('TimerContext: Received live results:', data);
      // リセット状態の場合はデータを無視
      if (resultsCleared || resetAttempted.current) {
        console.log('TimerContext: Ignoring live results due to reset state');
        return;
      }
      
      if (Array.isArray(data)) {
        setLiveResults(data);
      }
    };

    const handleResultsCleared = () => {
      console.log('TimerContext: Results cleared from server');
      setLiveResults([]);
      setResultsCleared(true);
      clearConfirmed.current = true;
    };

    const handleClearConfirmed = (data) => {
      console.log('TimerContext: Clear confirmed from server:', data);
      if (data.success) {
        clearConfirmed.current = true;
        if (data.clearId) {
          setClearId(data.clearId);
        }
      }
    };

    // リスナーを登録
    socket.on('liveResultsUpdated', handleLiveResults);
    socket.on('resultsCleared', handleResultsCleared);
    socket.on('clearResultsConfirmed', handleClearConfirmed);

    // 接続時にデータをリクエスト
    if (isConnected) {
      console.log('TimerContext: Connected to server');
      
      // リセット済みの場合はサーバーのデータをクリア
      if (resultsCleared || resetAttempted.current) {
        console.log('TimerContext: Clearing results on reconnect');
        socket.emit('notifyReset'); // リセット状態を通知
        socket.emit('clearResults');
        resetAttempted.current = false;
      } else {
        socket.emit('getLiveResults');
      }
    }

    return () => {
      if (socket) {
        socket.off('liveResultsUpdated', handleLiveResults);
        socket.off('resultsCleared', handleResultsCleared);
        socket.off('clearResultsConfirmed', handleClearConfirmed);
      }
    };
  }, [socket, isConnected, resultsCleared]);

  // 初期化時にリセット状態を確認
  useEffect(() => {
    // ローカルストレージからリセット情報を取得
    const lastReset = localStorage.getItem('lastReset');
    const lastSync = localStorage.getItem('lastSync');
    
    // リセット後に同期していない場合
    if (lastReset && (!lastSync || parseInt(lastReset) > parseInt(lastSync))) {
      setResultsCleared(true);
      
      // サーバーに接続している場合は通知
      if (socket && socket.connected) {
        console.log('Syncing reset state with server on initialization');
        socket.emit('notifyReset', { 
          timestamp: parseInt(lastReset),
          onInitialization: true 
        });
        
        // 同期情報を更新
        localStorage.setItem('lastSync', Date.now().toString());
      }
    }
  }, [socket]);

  // ラップを記録
  const recordLap = useCallback((lapNumber) => {
    if (!socket || !isConnected) {
      console.error('TimerContext: Cannot record lap, socket not connected');
      return;
    }
    
    const lap = {
      number: lapNumber,
      total_time: time,
      timestamp: new Date().toISOString(),
      clearId: clearId
    };
    
    console.log('TimerContext: Recording lap', lap);
    socket.emit('recordLap', lap);
    
    // ローカルのラップ配列にも追加
    setLaps(prevLaps => [...prevLaps, lap]);
  }, [socket, isConnected, time, clearId]);

  // タイマーの更新
  useEffect(() => {
    let interval;
    
    if (isRunning) {
      // 開始時間が設定されていない場合は設定
      if (!startTime) {
        const newStartTime = Date.now() - time;
        console.log('TimerContext: Setting start time', newStartTime);
        setStartTime(newStartTime);
      }
      
      interval = setInterval(() => {
        const currentTime = Date.now() - startTime;
        setTime(currentTime);
      }, 10);
      
      console.log('TimerContext: Timer started', { startTime, time });
      
      // タイマーが開始されたらリセットフラグをクリア
      if (resultsCleared && clearConfirmed.current) {
        setResultsCleared(false);
        clearConfirmed.current = false;
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('TimerContext: Timer interval cleared');
      }
    };
  }, [isRunning, startTime, resultsCleared]);

  // タイマーをリセット
  const resetTimer = useCallback(() => {
    setTime(0);
    setIsRunning(false);
    setLaps([]);
    setStartTime(null);
    setResultsCleared(true);
    
    // リセット情報をローカルストレージに保存
    try {
      localStorage.setItem('lastReset', Date.now().toString());
      localStorage.removeItem('timerState');
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
    
    // サーバーにリセット通知を送信
    if (socket && socket.connected) {
      console.log('Sending reset notification to server');
      socket.emit('notifyReset');
    } else {
      console.log('Socket not connected, reset will be synced on reconnection');
    }
  }, [socket]);

  // タイマーを開始
  const startTimer = () => {
    if (!isRunning) {
      console.log('TimerContext: Starting timer');
      
      // リセット後の最初のスタート時は、サーバーのデータが確実にクリアされていることを確認
      if (resultsCleared && !clearConfirmed.current && socket && isConnected) {
        console.log('TimerContext: Ensuring server data is cleared before starting');
        socket.emit('clearResults');
        
        // 少し待ってからスタート
        setTimeout(() => {
          setIsRunning(true);
          setStartTime(Date.now());
          
          if (resultsCleared) {
            setResultsCleared(false);
            resetAttempted.current = false;
          }
        }, 300);
        return;
      }
      
      setIsRunning(true);
      setStartTime(Date.now() - time);
      
      // タイマーが開始されたらリセットフラグをクリア
      if (resultsCleared) {
        setResultsCleared(false);
        resetAttempted.current = false;
      }
    }
  };

  // タイマーを停止
  const stopTimer = () => {
    console.log('TimerContext: Stopping timer');
    setIsRunning(false);
  };

  const value = {
    time,
    setTime,
    isRunning,
    setIsRunning,
    laps,
    setLaps,
    liveResults,
    resultsCleared,
    clearId,
    socket,
    resetTimer,
    startTimer,
    stopTimer,
    recordLap
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
} 