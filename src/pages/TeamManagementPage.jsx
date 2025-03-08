import React, { useState, useEffect } from 'react'

function TeamManagementPage() {
  const [teams, setTeams] = useState([])
  const [newTeam, setNewTeam] = useState({
    name: '',
    bibNumber: '',
    division: 'general',
    runners: [
      { name: '', position: 1 },
      { name: '', position: 2 },
      { name: '', position: 3 },
      { name: '', position: 4 },
      { name: '', position: 5 }
    ]
  })
  const [csvError, setCsvError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editTeamId, setEditTeamId] = useState(null)

  // コンポーネントマウント時にチーム情報を取得
  useEffect(() => {
    fetchTeams()
  }, [])

  // チーム情報をサーバーから取得
  const fetchTeams = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      console.log('チーム情報を取得中...')
      const response = await fetch('/api/teams')
      
      console.log('APIレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers])
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('APIエラーレスポンス:', errorText)
        throw new Error(`チーム情報の取得に失敗しました (${response.status}: ${response.statusText})`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('JSONではないレスポンス:', text)
        throw new Error('サーバーからの応答が不正な形式です')
      }
      
      const data = await response.json()
      console.log('取得したチーム数:', data.length)
      setTeams(data)
    } catch (error) {
      console.error('チーム情報の取得エラー:', error)
      setErrorMessage(`チーム情報の取得に失敗しました: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // チーム登録フォームの送信処理
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 入力検証
    if (!newTeam.name.trim()) {
      alert('チーム名を入力してください')
      return
    }
    
    if (!newTeam.bibNumber.trim()) {
      alert('ゼッケン番号を入力してください')
      return
    }
    
    // すべての走者情報が必須
    const allRunnersProvided = newTeam.runners.every(runner => runner.name.trim() !== '')
    if (!allRunnersProvided) {
      alert('すべての走者情報を入力してください')
      return
    }

    setIsLoading(true)
    
    try {
      // 編集モードの場合は更新、そうでなければ新規作成
      const url = editMode ? `/api/teams/${editTeamId}` : '/api/teams'
      const method = editMode ? 'PUT' : 'POST'
      
      const teamData = { 
        ...newTeam, 
        runners: newTeam.runners.map(runner => ({
          ...runner,
          name: runner.name.trim()
        }))
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      })
      
      if (!response.ok) {
        throw new Error(editMode ? 'チームの更新に失敗しました' : 'チームの登録に失敗しました')
      }
      
      const savedTeam = await response.json()
      
      if (editMode) {
        // 編集モードの場合は該当チームを更新
        setTeams(prevTeams => 
          prevTeams.map(team => team.id === editTeamId ? savedTeam : team)
        )
        setEditMode(false)
        setEditTeamId(null)
        setSuccessMessage('チームを更新しました')
      } else {
        // 新規作成の場合は配列に追加
        setTeams(prevTeams => [...prevTeams, savedTeam])
        setSuccessMessage('チームを登録しました')
      }
      
      // フォームをリセット
      setNewTeam({
        name: '',
        bibNumber: '',
        division: 'general',
        runners: [
          { name: '', position: 1 },
          { name: '', position: 2 },
          { name: '', position: 3 },
          { name: '', position: 4 },
          { name: '', position: 5 }
        ]
      })
    } catch (error) {
      console.error('チーム保存エラー:', error)
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setSuccessMessage('')
        setErrorMessage('')
      }, 3000)
    }
  }

  // 走者情報の更新
  const handleRunnerChange = (index, value) => {
    const updatedRunners = [...newTeam.runners];
    updatedRunners[index] = { ...updatedRunners[index], name: value || '' }; // 空文字列をデフォルト値として設定
    setNewTeam({ ...newTeam, runners: updatedRunners });
  }

  // CSVファイルの処理
  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setCsvError('')
    setIsLoading(true)
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csvData = event.target.result
        const lines = csvData.split('\n')
        
        // ヘッダー行をスキップ
        const teamsToImport = []
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          const values = line.split(',')
          
          // CSVの形式: チーム名,ゼッケン番号,部門,走者1,走者2,走者3,走者4,走者5
          if (values.length < 8) {
            throw new Error(`行 ${i+1} のデータが不足しています。すべての走者情報が必要です。`)
          }
          
          const teamName = values[0].trim()
          const bibNumber = values[1].trim()
          const divisionText = values[2].trim()
          const division = divisionText === '女子・小学生の部' ? 'women_elementary' : 'general'
          
          // すべてのフィールドが入力されているか確認
          if (!teamName || !bibNumber) {
            throw new Error(`行 ${i+1} のチーム名またはゼッケン番号が入力されていません。`)
          }
          
          // 走者情報を取得
          const runners = []
          for (let j = 3; j < 8; j++) {
            const runnerName = values[j].trim()
            if (!runnerName) {
              throw new Error(`行 ${i+1} の走者${j-2}の情報が入力されていません。`)
            }
            runners.push({
              name: runnerName,
              position: j - 2 // 1-indexed position
            })
          }
          
          // チームを追加
          teamsToImport.push({
            name: teamName,
            bibNumber: bibNumber,
            division: division,
            runners: runners
          })
        }
        
        // サーバーに一括登録
        const response = await fetch('/api/teams/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(teamsToImport),
        })
        
        if (!response.ok) {
          throw new Error('チームの一括インポートに失敗しました')
        }
        
        const savedTeams = await response.json()
        
        // インポートしたチームを追加
        setTeams(prevTeams => [...prevTeams, ...savedTeams])
        
        // 成功メッセージを表示
        setSuccessMessage(`${savedTeams.length}チームをインポートしました`)
        
        // ファイル入力をリセット
        e.target.value = null
      } catch (error) {
        console.error('CSVインポートエラー:', error)
        setCsvError(`CSVの解析に失敗しました: ${error.message}`)
        e.target.value = null
      } finally {
        setIsLoading(false)
        // 3秒後に成功メッセージをクリア
        setTimeout(() => {
          setSuccessMessage('')
          setCsvError('')
        }, 3000)
      }
    }
    
    reader.onerror = () => {
      setCsvError('ファイルの読み込みに失敗しました')
      e.target.value = null
      setIsLoading(false)
    }
    
    reader.readAsText(file)
  }

  // チームの削除
  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('このチームを削除してもよろしいですか？')) {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          throw new Error('チームの削除に失敗しました')
        }
        
        setTeams(teams.filter(team => team.id !== teamId))
        setSuccessMessage('チームを削除しました')
      } catch (error) {
        console.error('チーム削除エラー:', error)
        setErrorMessage('チームの削除に失敗しました: ' + error.message)
      } finally {
        setIsLoading(false)
        setTimeout(() => {
          setSuccessMessage('')
          setErrorMessage('')
        }, 3000)
      }
    }
  }

  // チームの編集モードを開始
  const handleEditTeam = (team) => {
    setNewTeam({
      name: team.name,
      bibNumber: team.bibNumber,
      division: team.division,
      runners: team.runners.map(runner => ({ ...runner }))
    })
    setEditMode(true)
    setEditTeamId(team.id)
    
    // フォーム部分にスクロール
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // 編集モードをキャンセル
  const handleCancelEdit = () => {
    setEditMode(false)
    setEditTeamId(null)
    setNewTeam({
      name: '',
      bibNumber: '',
      division: 'general',
      runners: [
        { name: '', position: 1 },
        { name: '', position: 2 },
        { name: '', position: 3 },
        { name: '', position: 4 },
        { name: '', position: 5 }
      ]
    })
  }

  // サンプルチームデータを生成する関数
  const generateSampleTeams = () => {
    const sampleTeams = [
      {
        name: "陸上クラブA",
        bibNumber: "01",
        division: "general",
        runners: [
          { name: "山田太郎", position: 1 },
          { name: "佐藤次郎", position: 2 },
          { name: "鈴木三郎", position: 3 },
          { name: "田中四郎", position: 4 },
          { name: "伊藤五郎", position: 5 }
        ]
      },
      {
        name: "陸上クラブB",
        bibNumber: "02",
        division: "general",
        runners: [
          { name: "高橋一男", position: 1 },
          { name: "渡辺二男", position: 2 },
          { name: "小林三男", position: 3 },
          { name: "加藤四男", position: 4 },
          { name: "吉田五男", position: 5 }
        ]
      },
      {
        name: "女子陸上部A",
        bibNumber: "03",
        division: "women_elementary",
        runners: [
          { name: "佐々木一子", position: 1 },
          { name: "山本二子", position: 2 },
          { name: "斎藤三子", position: 3 },
          { name: "中村四子", position: 4 },
          { name: "松本五子", position: 5 }
        ]
      },
      {
        name: "女子陸上部B",
        bibNumber: "04",
        division: "women_elementary",
        runners: [
          { name: "井上花子", position: 1 },
          { name: "木村梅子", position: 2 },
          { name: "林さくら", position: 3 },
          { name: "清水もも", position: 4 },
          { name: "山下れい", position: 5 }
        ]
      },
      {
        name: "市民ランナーズ",
        bibNumber: "05",
        division: "general",
        runners: [
          { name: "大野健太", position: 1 },
          { name: "村田誠", position: 2 },
          { name: "藤田剛", position: 3 },
          { name: "後藤優", position: 4 },
          { name: "中島大輔", position: 5 }
        ]
      },
      {
        name: "小学生チームA",
        bibNumber: "06",
        division: "women_elementary",
        runners: [
          { name: "岡田太一", position: 1 },
          { name: "前田次一", position: 2 },
          { name: "小川三一", position: 3 },
          { name: "長谷川四一", position: 4 },
          { name: "森五一", position: 5 }
        ]
      },
      {
        name: "会社チームA",
        bibNumber: "07",
        division: "general",
        runners: [
          { name: "石井一郎", position: 1 },
          { name: "山崎二郎", position: 2 },
          { name: "池田三郎", position: 3 },
          { name: "上田四郎", position: 4 },
          { name: "原田五郎", position: 5 }
        ]
      },
      {
        name: "会社チームB",
        bibNumber: "08",
        division: "general",
        runners: [
          { name: "宮崎健一", position: 1 },
          { name: "内田勇二", position: 2 },
          { name: "坂本力三", position: 3 },
          { name: "横山進四", position: 4 },
          { name: "阿部信五", position: 5 }
        ]
      },
      {
        name: "女子チームC",
        bibNumber: "09",
        division: "women_elementary",
        runners: [
          { name: "橋本美咲", position: 1 },
          { name: "松田優子", position: 2 },
          { name: "金子愛", position: 3 },
          { name: "水野恵", position: 4 },
          { name: "野口幸子", position: 5 }
        ]
      },
      {
        name: "地元ランナーズ",
        bibNumber: "10",
        division: "general",
        runners: [
          { name: "菊地正人", position: 1 },
          { name: "杉山和男", position: 2 },
          { name: "千葉大志", position: 3 },
          { name: "小島勇気", position: 4 },
          { name: "市川努", position: 5 }
        ]
      }
    ];
    
    return sampleTeams;
  };

  // サンプルデータをロードするボタンを追加
  const handleLoadSampleData = async () => {
    if (window.confirm('サンプルデータ（10チーム）をロードしますか？既存のデータは保持されます。')) {
      setIsLoading(true);
      setErrorMessage('');
      
      try {
        console.log('サンプルデータの生成...');
        const sampleTeams = generateSampleTeams();
        console.log(`${sampleTeams.length}件のサンプルデータを生成しました`);
        
        // サーバーに一括登録
        console.log('サンプルデータをサーバーに送信中...');
        const response = await fetch('/api/teams/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sampleTeams),
        });
        
        // レスポンスの内容を取得
        const responseText = await response.text();
        console.log('サーバーからのレスポンス:', responseText);
        
        let responseData;
        try {
          // JSONとしてパース
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('JSONパースエラー:', e);
          console.error('レスポンステキスト:', responseText);
          throw new Error(`サーバーからの応答を解析できませんでした: ${responseText.substring(0, 100)}...`);
        }
        
        if (!response.ok) {
          console.error('APIエラーレスポンス:', responseData);
          let errorMessage = 'サンプルデータの登録に失敗しました';
          
          if (responseData) {
            if (responseData.error) {
              errorMessage += `: ${responseData.error}`;
            } else if (responseData.message) {
              errorMessage += `: ${responseData.message}`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        console.log(`${responseData.length}件のチームデータを受信しました`);
        
        // 保存したチームを追加
        setTeams(prevTeams => [...prevTeams, ...responseData]);
        setSuccessMessage('10チームのサンプルデータをロードしました');
      } catch (error) {
        console.error('サンプルデータ登録エラー:', error);
        
        // エラーメッセージを詳細に表示
        let detailedError = error.message;
        if (detailedError.includes('Unknown column')) {
          detailedError += ' - データベースのテーブル構造が正しくありません。サーバーを再起動してください。';
        }
        
        setErrorMessage('サンプルデータの登録に失敗しました: ' + detailedError);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          setSuccessMessage('');
          // エラーメッセージは手動でクリアするまで表示したままにする
          // setErrorMessage('');
        }, 3000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">チーム管理</h1>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          {successMessage}
        </div>
      )}

      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          {errorMessage}
        </div>
      )}

      {/* ローディングインジケーター */}
      {isLoading && (
        <div className="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4">
          処理中...
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editMode ? 'チーム情報編集' : '新規チーム登録'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                チーム名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ゼッケン番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTeam.bibNumber}
                onChange={(e) => setNewTeam({ ...newTeam, bibNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="例: 01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              部門 <span className="text-red-500">*</span>
            </label>
            <select
              value={newTeam.division}
              onChange={(e) => setNewTeam({ ...newTeam, division: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="general">一般の部</option>
              <option value="women_elementary">女子・小学生の部</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              走者情報 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {newTeam.runners.map((runner, index) => (
                <div key={index} className="flex items-center">
                  <span className="w-16 text-sm text-gray-500">走者{index + 1}:</span>
                  <input
                    type="text"
                    value={runner.name}
                    onChange={(e) => handleRunnerChange(index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={`走者${index + 1}の名前`}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            {editMode && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              className={`flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {editMode ? 'チームを更新' : 'チームを登録'}
            </button>
          </div>
        </form>
      </div>

      {/* CSVインポート */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">CSVインポート</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            CSVファイルからチーム情報を一括インポートできます。<br />
            形式: チーム名,ゼッケン番号,部門,走者1,走者2,走者3,走者4,走者5
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSVファイルを選択
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isLoading}
            />
          </div>
          
          {csvError && (
            <div className="text-red-500 text-sm">
              {csvError}
            </div>
          )}
          
          <div className="text-sm text-gray-600 border p-3 rounded bg-gray-50">
            <p className="font-medium mb-1">CSVサンプル (すべてのフィールドが必須):</p>
            <pre className="whitespace-pre-wrap">
              チーム名,ゼッケン番号,部門,走者1,走者2,走者3,走者4,走者5
              チームA,01,一般の部,山田太郎,佐藤次郎,鈴木三郎,田中四郎,伊藤五郎
              チームB,02,女子・小学生の部,小林一子,高橋二子,加藤三子,山本四子,佐々木五子
            </pre>
          </div>
        </div>
      </div>

      {/* サンプルデータ */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">サンプルデータ</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            テスト用に10チーム分のサンプルデータをロードできます。
          </p>
          
          <button
            onClick={handleLoadSampleData}
            className={`w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            サンプルデータをロード
          </button>
        </div>
      </div>

      {/* 登録チーム一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">登録チーム一覧</h2>
        {teams.length === 0 ? (
          <p className="text-gray-500">登録されているチームはありません</p>
        ) : (
          <div className="space-y-4">
            {teams.map(team => (
              <div key={team.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">{team.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      ゼッケン: {team.bibNumber} | 部門: {team.division === 'general' ? '一般の部' : '女子・小学生の部'}
                    </p>
                    
                    {team.runners.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">走者:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 pl-2">
                          {team.runners.map((runner, index) => (
                            <li key={index}>
                              走者{runner.position}: {runner.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTeam(team)}
                      className="text-blue-500 hover:text-blue-700"
                      title="チームを編集"
                      disabled={isLoading}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-red-500 hover:text-red-700"
                      title="チームを削除"
                      disabled={isLoading}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamManagementPage 