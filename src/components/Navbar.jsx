import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">
                駅伝計測システム
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 ${isActive('/')}`}
              >
                ストップウォッチ
              </Link>
              <Link
                to="/racer-input"
                className={`inline-flex items-center px-1 pt-1 ${isActive('/racer-input')}`}
              >
                ゼッケン入力
              </Link>
              <Link
                to="/team-management"
                className={`inline-flex items-center px-1 pt-1 ${isActive('/team-management')}`}
              >
                チーム管理
              </Link>
              <Link
                to="/rankings"
                className={`inline-flex items-center px-1 pt-1 ${isActive('/rankings')}`}
              >
                順位表
              </Link>
              <Link
                to="/live-results"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-500"
              >
                リアルタイム結果
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 