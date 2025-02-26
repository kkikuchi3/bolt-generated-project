import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'

function RacerInputPage() {
  const [bibNumber, setBibNumber] = useState('')
  const [records, setRecords] = useState([])
  const [pendingRecords, setPendingRecords] = useState([]) // オフライン時の未同期記録
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [insertMode, setInsertMode] = useState(false)
  const [insertIndex, setInsertIndex] = useState(null)
  const { socket, isConnected } = useSocket()

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedRecords = localStorage.getItem('bibRecords')
    const savedPendingRecords = localStorage.getItem('pendingBibRecords')
    
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords))
      } catch (e) {
        console.error('Failed to parse saved bib records:', e)
      }
    }
    
    if (savedPendingRecords) {
      try {
        setPendingRecords(JSON.parse(savedPendingRecords))
      } catch (e) {
        console.error('Failed to parse saved pending bib records:', e)
      }
    }
  }, [])

  // 記録をローカルストレージに保存
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem('bibRecords', JSON.stringify(records))
    } else {
      localStorage.removeItem('bibRecords')
    }
  }, [records])

  // 未同期記録をローカルストレージに保存
  useEffect(() => {
    if (pendingRecords.length > 0) {
      localStorage.setItem('pendingBibRecords', JSON.stringify(pendingRecords))
    } else {
      localStorage.removeItem('pendingBibRecords')
    }
  }, [pendingRecords])

  // 接続状態が変わったときに未同期データを送信
  useEffect(() => {
    if (isConnected && pendingRecords.length > 0 && socket) {
      console.log('Connection restored. Syncing pending bib records:', pendingRecords)
      
      // 未同期の記録を一つずつ送信
      pendingRecords.forEach(record => {
        socket.emit('recordBib', { bibNumber: record.bibNumber })
      })
      
      // 送信後にペンディングリストをクリア
      setPendingRecords([])
      setSuccess('オフライン時の記録をサーバーと同期しました')
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    }
  }, [isConnected, pendingRecords, socket])

  // 記録のIDを振り直す
  const renumberRecords = (recordsToRenumber) => {
    return recordsToRenumber.map((record, index) => ({
      ...record,
      id: recordsToRenumber.length - index // 逆順に番号を振る（新しい記録が大きい番号）
    }))
  }

  // 入力フォームの送信処理
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!bibNumber.trim()) {
      setError('ゼッケン番号を入力してください')
      return
    }
    
    if (editMode && editIndex !== null) {
      // 編集モード: 既存の記録を更新
      handleUpdateRecord(editIndex)
    } else if (insertMode && insertIndex !== null) {
      // 挿入モード: 特定の位置に記録を挿入
      handleInsertRecordSubmit(insertIndex)
    } else {
      // 通常モード: 新しい記録を追加
      handleAddRecord()
    }
  }

  // 新しい記録を追加
  const handleAddRecord = () => {
    // 新しい記録を作成（IDは一時的なもの）
    const newRecord = {
      id: 0, // 後で振り直すので仮の値
      bibNumber: bibNumber.trim(),
      timestamp: new Date().toLocaleTimeString()
    }
    
    // サーバーにゼッケン番号を送信（接続されている場合のみ）
    if (isConnected && socket) {
      socket.emit('recordBib', { bibNumber: bibNumber.trim() })
    } else {
      // オフライン時は未同期リストに追加
      setPendingRecords(prev => [...prev, newRecord])
    }
    
    // 記録リストに追加して番号を振り直す
    setRecords(prevRecords => {
      const updatedRecords = [newRecord, ...prevRecords]
      return renumberRecords(updatedRecords)
    })
    
    // 成功メッセージを表示
    setSuccess(`ゼッケン番号 ${bibNumber} を記録しました`)
    
    // 入力フィールドをクリア
    setBibNumber('')
    
    // エラーメッセージをクリア
    setError('')
    
    // 3秒後に成功メッセージをクリア
    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  // 編集モードを開始
  const handleEditMode = (index, currentBibNumber) => {
    setEditMode(true)
    setInsertMode(false)
    setEditIndex(index)
    setBibNumber(currentBibNumber)
  }

  // 挿入モードを開始
  const handleInsertMode = (index) => {
    setInsertMode(true)
    setEditMode(false)
    setInsertIndex(index)
    setBibNumber('')
  }

  // 特定の位置に記録を挿入
  const handleInsertRecordSubmit = (index) => {
    // 新しい記録を作成（IDは一時的なもの）
    const newRecord = {
      id: 0, // 後で振り直すので仮の値
      bibNumber: bibNumber.trim(),
      timestamp: new Date().toLocaleTimeString() + ' (挿入)'
    }
    
    // サーバーにゼッケン番号を送信（接続されている場合のみ）
    if (isConnected && socket) {
      socket.emit('recordBib', { bibNumber: bibNumber.trim() })
    } else {
      // オフライン時は未同期リストに追加
      setPendingRecords(prev => [...prev, newRecord])
    }
    
    // 記録リストに挿入して番号を振り直す
    setRecords(prevRecords => {
      const updatedRecords = [...prevRecords]
      updatedRecords.splice(index, 0, newRecord)
      return renumberRecords(updatedRecords)
    })
    
    // 挿入モードを終了
    setInsertMode(false)
    setInsertIndex(null)
    
    // 成功メッセージを表示
    setSuccess(`ゼッケン番号 ${bibNumber} を挿入しました`)
    
    // 入力フィールドをクリア
    setBibNumber('')
    
    // エラーメッセージをクリア
    setError('')
    
    // 3秒後に成功メッセージをクリア
    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  // 記録を更新
  const handleUpdateRecord = (index) => {
    setRecords(prevRecords => {
      const updatedRecords = [...prevRecords]
      const recordToUpdate = updatedRecords[index]
      
      // 記録を更新
      updatedRecords[index] = {
        ...recordToUpdate,
        bibNumber: bibNumber.trim(),
        timestamp: new Date().toLocaleTimeString() + ' (編集済)'
      }
      
      return updatedRecords // 編集では番号を振り直さない
    })
    
    // 編集モードを終了
    setEditMode(false)
    setEditIndex(null)
    
    // 成功メッセージを表示
    setSuccess(`ゼッケン番号を ${bibNumber} に更新しました`)
    
    // 入力フィールドをクリア
    setBibNumber('')
    
    // エラーメッセージをクリア
    setError('')
    
    // 3秒後に成功メッセージをクリア
    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  // 記録を削除
  const handleDeleteRecord = (id) => {
    // 削除確認
    if (window.confirm('この記録を削除してもよろしいですか？')) {
      // 記録を削除して番号を振り直す
      setRecords(prevRecords => {
        const filteredRecords = prevRecords.filter(record => record.id !== id)
        return renumberRecords(filteredRecords)
      })
      
      setSuccess('記録を削除しました')
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    }
  }

  // 編集/挿入モードをキャンセル
  const handleCancelMode = () => {
    setEditMode(false)
    setInsertMode(false)
    setEditIndex(null)
    setInsertIndex(null)
    setBibNumber('')
  }

  // 現在のモードを取得
  const getCurrentMode = () => {
    if (editMode) return 'edit'
    if (insertMode) return 'insert'
    return 'record'
  }

  // モードに応じた色を取得
  const getModeColor = () => {
    switch (getCurrentMode()) {
      case 'edit':
        return 'yellow'
      case 'insert':
        return 'green'
      default:
        return 'blue'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">ゼッケン番号入力</h1>
      
      {/* 接続状態表示 */}
      <div className="mb-4 flex justify-end">
        <div className="flex items-center">
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '接続中' : 'オフライン'}
          </span>
          {pendingRecords.length > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              未同期: {pendingRecords.length}
            </span>
          )}
        </div>
      </div>
      
      {/* 入力フォーム */}
      <div className={`bg-white p-6 rounded-lg shadow-md mb-8 border-t-4 border-${getModeColor()}-500`}>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="bibNumber" className="block text-gray-700 font-medium mb-2">
              {getCurrentMode() === 'edit' 
                ? 'ゼッケン番号を編集' 
                : getCurrentMode() === 'insert' 
                  ? 'ゼッケン番号を挿入' 
                  : 'ゼッケン番号'}
            </label>
            <input
              type="text"
              id="bibNumber"
              value={bibNumber}
              onChange={(e) => setBibNumber(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: A123"
              autoFocus
            />
          </div>
          
          <div className="flex justify-between">
            <div>
              {(editMode || insertMode) && (
                <button
                  type="button"
                  onClick={handleCancelMode}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 mr-2"
                >
                  キャンセル
                </button>
              )}
            </div>
            
            <button
              type="submit"
              className={`px-4 py-2 bg-${getModeColor()}-600 text-white rounded-md hover:bg-${getModeColor()}-700`}
            >
              {getCurrentMode() === 'edit' 
                ? '更新' 
                : getCurrentMode() === 'insert' 
                  ? '挿入' 
                  : '記録'}
            </button>
          </div>
        </form>
        
        {/* エラーメッセージ */}
        {error && (
          <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            {error}
          </div>
        )}
        
        {/* 成功メッセージ */}
        {success && (
          <div className="mt-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
            {success}
          </div>
        )}
      </div>
      
      {/* 記録一覧 */}
      {records.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">記録一覧</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ゼッケン
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時刻
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record, index) => (
                  <React.Fragment key={record.id}>
                    {/* 挿入モードで現在の位置が選択されている場合、挿入位置を示す行を表示 */}
                    {insertMode && insertIndex === index && (
                      <tr className="bg-green-50 border-t-2 border-b-2 border-green-200">
                        <td colSpan="4" className="px-6 py-2 text-center text-sm text-green-600 font-medium">
                          ここに挿入します
                        </td>
                      </tr>
                    )}
                    
                    <tr className={editIndex === index ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.bibNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleInsertMode(index)}
                          className="text-green-600 hover:text-green-900 mr-2"
                          title="この位置に新しい記録を挿入"
                        >
                          挿入
                        </button>
                        <button
                          onClick={() => handleEditMode(index, record.bibNumber)}
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                          title="この記録を編集"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-600 hover:text-red-900"
                          title="この記録を削除"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                
                {/* 最後の位置に挿入する場合 */}
                {insertMode && insertIndex === records.length && (
                  <tr className="bg-green-50 border-t-2 border-b-2 border-green-200">
                    <td colSpan="4" className="px-6 py-2 text-center text-sm text-green-600 font-medium">
                      ここに挿入します
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* 最後に挿入するボタン */}
          <div className="mt-4 text-right">
            <button
              onClick={() => handleInsertMode(records.length)}
              className="text-sm text-green-600 hover:text-green-800"
            >
              最後に挿入
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RacerInputPage 