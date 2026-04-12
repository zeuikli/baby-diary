import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, BarChart2, BookOpen, Settings, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Navigation() {
  const { enableDiary } = useApp()

  const navItems = [
    { path: '/', icon: Home, label: '首頁' },
    { path: '/stats', icon: BarChart2, label: '統計' },
    { path: '/growth', icon: TrendingUp, label: '成長' },
    ...(enableDiary ? [{ path: '/diary', icon: BookOpen, label: '日記' }] : []),
    { path: '/settings', icon: Settings, label: '設定' },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/90 backdrop-blur-sm border-t border-pink-100 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all touch-manipulation ${
                isActive
                  ? 'text-pink-500'
                  : 'text-gray-400 active:text-pink-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-pink-100' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
