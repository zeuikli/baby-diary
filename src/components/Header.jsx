import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, ChevronLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BabySelector from './BabySelector'

const PAGE_TITLES = {
  '/': null,
  '/feeding': '喝奶紀錄',
  '/sleep': '睡眠紀錄',
  '/diaper': '尿布紀錄',
  '/other': '其他紀錄',
  '/solids': '副食品紀錄',
  '/growth': '成長曲線',
  '/diary': '育兒日記',
  '/stats': '統計報表',
  '/settings': '設定',
  '/import': '資料匯入',
  '/export': '資料匯出',
}

export default function Header() {
  const { syncing, isGitHubConfigured } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const title = PAGE_TITLES[location.pathname]

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-pink-100 safe-top">
      <div className="flex items-center gap-3 px-4 py-3 min-h-[3.5rem]">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-pink-50 active:bg-pink-100 transition-colors"
          >
            <ChevronLeft size={22} className="text-gray-500" />
          </button>
        )}

        {isHome ? (
          <div className="flex-1">
            <BabySelector />
          </div>
        ) : (
          <h1 className="flex-1 text-base font-semibold text-gray-800">{title}</h1>
        )}

        <div className="flex items-center gap-2">
          {syncing ? (
            <div className="w-5 h-5 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
          ) : isGitHubConfigured ? (
            <Cloud size={18} className="text-green-400" />
          ) : (
            <CloudOff size={18} className="text-gray-300" />
          )}
        </div>
      </div>
    </header>
  )
}
