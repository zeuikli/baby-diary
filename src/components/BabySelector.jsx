import React, { useState, useRef } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../services/github'

export default function BabySelector() {
  const { babies, activeBaby, activeBabyId, setActiveBaby, selectedDate, setSelectedDate } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const dateInputRef = useRef(null)

  const today = formatDate()

  const handleDateChange = (delta) => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + delta)
    const newDate = formatDate(current)
    if (newDate <= today) setSelectedDate(newDate)
  }

  const handleDatePick = (e) => {
    const val = e.target.value
    if (val && val <= today) setSelectedDate(val)
  }

  const formatDisplayDate = (dateStr) => {
    if (dateStr === today) return '今天'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateStr === formatDate(yesterday)) return '昨天'

    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  if (babies.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">🍼</span>
        <div>
          <p className="font-semibold text-gray-800 text-sm leading-tight">寶寶成長日記</p>
          <button
            onClick={() => navigate('/settings')}
            className="text-xs text-pink-500 flex items-center gap-0.5"
          >
            <Plus size={12} /> 新增寶寶
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Baby selector */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 touch-manipulation"
        >
          <span className="text-2xl leading-none">{activeBaby?.avatar || '👶'}</span>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-800 text-sm">{activeBaby?.name || '寶寶'}</span>
              {babies.length > 1 && <ChevronDown size={14} className="text-gray-400" />}
            </div>
            <span className="text-xs text-pink-400">{activeBaby?.gender === 'boy' ? '男寶' : activeBaby?.gender === 'girl' ? '女寶' : ''}</span>
          </div>
        </button>

        {open && babies.length > 1 && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-lg border border-pink-100 py-2 min-w-32 z-50 animate-bounce-in">
            {babies.map(baby => (
              <button
                key={baby.id}
                onClick={() => { setActiveBaby(baby.id); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-pink-50 transition-colors ${baby.id === activeBabyId ? 'text-pink-500 font-medium' : 'text-gray-700'}`}
              >
                <span className="text-lg">{baby.avatar || '👶'}</span>
                {baby.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-1 ml-auto bg-pink-50 rounded-xl px-2 py-1">
        <button
          onClick={() => handleDateChange(-1)}
          className="w-6 h-6 flex items-center justify-center text-gray-500 active:text-pink-500 touch-manipulation"
        >
          ‹
        </button>
        <button
          onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
          className="relative text-xs font-medium text-gray-700 min-w-8 text-center touch-manipulation"
        >
          {formatDisplayDate(selectedDate)}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={today}
            onChange={handleDatePick}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            tabIndex={-1}
          />
        </button>
        <button
          onClick={() => handleDateChange(1)}
          disabled={selectedDate >= today}
          className="w-6 h-6 flex items-center justify-center text-gray-500 active:text-pink-500 disabled:opacity-30 touch-manipulation"
        >
          ›
        </button>
        {selectedDate !== today && (
          <button
            onClick={() => setSelectedDate(today)}
            className="text-[10px] font-bold text-pink-500 bg-white rounded-md px-1.5 py-0.5 ml-0.5 border border-pink-200 active:scale-95 touch-manipulation"
          >
            今
          </button>
        )}
      </div>
    </div>
  )
}
