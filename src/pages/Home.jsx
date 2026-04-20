import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Milk, Moon, Heart, Activity, Scissors, BookOpen, Scale, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Timeline from '../components/Timeline'
import QuickFeedingModal from '../components/modals/QuickFeedingModal'
import QuickSleepModal from '../components/modals/QuickSleepModal'
import QuickDiaperModal from '../components/modals/QuickDiaperModal'
import QuickSolidsModal from '../components/modals/QuickSolidsModal'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../services/github'

const quickActions = [
  { id: 'feeding', icon: '🍼', label: '喝奶', color: 'bg-blue-50 text-blue-500', border: 'border-blue-100' },
  { id: 'sleep', icon: '😴', label: '睡眠', color: 'bg-purple-50 text-purple-500', border: 'border-purple-100' },
  { id: 'diaper', icon: '🫧', label: '尿布', color: 'bg-yellow-50 text-yellow-600', border: 'border-yellow-100' },
  { id: 'pumping', icon: '🤱', label: '擠奶', color: 'bg-pink-50 text-pink-500', border: 'border-pink-100' },
  { id: 'solids', icon: '🥣', label: '副食品', color: 'bg-green-50 text-green-600', border: 'border-green-100' },
  { id: 'growth', icon: '📏', label: '成長', color: 'bg-orange-50 text-orange-500', border: 'border-orange-100' },
]

export default function Home() {
  const { today, loading, activeBaby, babies, selectedDate, deleteRecord } = useApp()
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState(null)
  const [editRecord, setEditRecord] = useState(null)
  const isToday = selectedDate === formatDate()

  if (babies.length === 0) {
    return (
      <div className="px-4 pt-4">
        <EmptyState
          icon="🍼"
          title="歡迎使用寶寶成長日記"
          subtitle="先新增一位寶寶，開始記錄珍貴的成長時刻"
          action={{ label: '新增寶寶', onClick: () => navigate('/settings') }}
        />
      </div>
    )
  }

  const babyAge = getBabyAge(activeBaby?.birthdate)

  const handleQuickAction = (id) => {
    setEditRecord(null)
    if (id === 'feeding') setActiveModal('feeding')
    else if (id === 'sleep') setActiveModal('sleep')
    else if (id === 'diaper') setActiveModal('diaper')
    else if (id === 'pumping') setActiveModal('pumping')
    else if (id === 'growth') navigate('/growth')
    else if (id === 'solids') setActiveModal('solids')
  }

  // Summary stats for today
  const feedingTotal = today?.feeding?.reduce((s, r) => s + (r.amount || 0), 0) || 0
  const feedingCount = today?.feeding?.length || 0
  const sleepTotal = today?.sleep?.reduce((s, r) => {
    if (r.end) {
      const diff = new Date(`2000-01-01T${r.end}`) - new Date(`2000-01-01T${r.start}`)
      return s + diff / 60000
    }
    return s
  }, 0) || 0
  const diaperCount = today?.diaper?.length || 0
  const pumpingTotal = today?.pumping?.reduce((s, r) => s + (r.amount || 0), 0) || 0
  const pumpingCount = today?.pumping?.length || 0
  const solidsCount = today?.solids?.length || 0
  const activeSleep = today?.sleep?.find(s => !s.end)

  // Elapsed time since last feeding / diaper
  const getElapsed = (records) => {
    if (!records || records.length === 0) return null
    const last = [...records].sort((a, b) => (b.time || b.start || '').localeCompare(a.time || a.start || ''))[0]
    const lastTime = last.time || last.start
    if (!lastTime) return null
    const now = new Date()
    const [h, m] = lastTime.split(':').map(Number)
    const recordDate = new Date(selectedDate + 'T00:00:00')
    recordDate.setHours(h, m, 0, 0)
    const diffMs = now - recordDate
    if (diffMs < 0) return null
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin} 分鐘前`
    const diffH = Math.floor(diffMin / 60)
    const remainMin = diffMin % 60
    if (diffH < 24) return `${diffH} 小時 ${remainMin} 分鐘前`
    return `超過 1 天前`
  }
  const feedingElapsed = isToday ? getElapsed(today?.feeding) : null
  const diaperElapsed = isToday ? getElapsed(today?.diaper) : null

  return (
    <div className="px-4 pt-4 space-y-4 animate-fade-in">
      {/* Baby info banner */}
      {activeBaby && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-3xl leading-none">{activeBaby.avatar || '👶'}</span>
          <div>
            <p className="text-base font-semibold text-gray-800">{activeBaby.name}</p>
            {babyAge ? (
              <p className="text-xs text-pink-400 font-medium">
                出生 {babyAge.months} 個月 {babyAge.days} 天
              </p>
            ) : activeBaby.birthdate ? null : (
              <p className="text-xs text-gray-400">尚未設定生日</p>
            )}
          </div>
        </div>
      )}

      {/* Active sleep timer */}
      {activeSleep && (
        <div className="card border-l-4 border-purple-300 bg-purple-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">😴</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-700">睡眠計時中...</p>
              <p className="text-xs text-purple-500">開始時間：{activeSleep.start}</p>
            </div>
            <button
              onClick={() => setActiveModal('sleep')}
              className="bg-purple-500 text-white text-xs px-3 py-1.5 rounded-xl font-medium"
            >
              停止
            </button>
          </div>
        </div>
      )}

      {/* Summary cards — only show types that have records today */}
      {(() => {
        const cards = []
        if (feedingCount > 0) cards.push(
          <SummaryCard key="feeding" icon="🍼" value={`${feedingTotal}ml`} label={`${feedingCount}次喝奶`} sub={feedingElapsed} color="text-blue-500" bg="bg-blue-50" onClick={() => navigate('/feeding')} />
        )
        if (today?.sleep?.length > 0) cards.push(
          <SummaryCard key="sleep" icon="😴" value={`${Math.floor(sleepTotal / 60)}h${Math.floor(sleepTotal % 60)}m`} label={`${today.sleep.length}次睡眠`} color="text-purple-500" bg="bg-purple-50" onClick={() => navigate('/sleep')} />
        )
        if (diaperCount > 0) cards.push(
          <SummaryCard key="diaper" icon="🫧" value={`${diaperCount}次`} label="尿布更換" sub={diaperElapsed} color="text-yellow-600" bg="bg-yellow-50" onClick={() => navigate('/diaper')} />
        )
        if (pumpingCount > 0) cards.push(
          <SummaryCard key="pumping" icon="🤱" value={`${pumpingTotal}ml`} label={`${pumpingCount}次擠奶`} color="text-pink-500" bg="bg-pink-50" onClick={() => navigate('/pumping')} />
        )
        if (solidsCount > 0) cards.push(
          <SummaryCard key="solids" icon="🥣" value={`${solidsCount}次`} label="副食品" color="text-green-600" bg="bg-green-50" onClick={() => navigate('/solids')} />
        )
        if (cards.length === 0) return null
        return <div className="grid grid-cols-3 gap-2">{cards}</div>
      })()}

      {/* Quick action buttons */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">快速記錄</h2>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${action.color} ${action.border} active:scale-95 transition-transform touch-manipulation`}
            >
              <span className="text-2xl leading-none">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {isToday ? '今日時間軸' : `${selectedDate} 時間軸`}
          </h2>
        </div>
        {loading ? (
          <div className="card flex items-center justify-center py-10">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
          </div>
        ) : (
          <Timeline
            today={today}
            onEditRecord={(type, record) => {
              setEditRecord(record)
              if (type === 'feeding') setActiveModal('feeding')
              else if (type === 'sleep') setActiveModal('sleep')
              else if (type === 'diaper') setActiveModal('diaper')
              else if (type === 'pumping') setActiveModal('pumping')
              else if (type === 'solids') setActiveModal('solids')
            }}
            onDeleteRecord={deleteRecord}
          />
        )}
      </div>

      {/* Modals */}
      {activeModal === 'feeding' && (
        <QuickFeedingModal editRecord={editRecord} onClose={() => { setActiveModal(null); setEditRecord(null) }} />
      )}
      {activeModal === 'sleep' && (
        <QuickSleepModal
          activeSleep={activeSleep}
          editRecord={editRecord}
          onClose={() => { setActiveModal(null); setEditRecord(null) }}
        />
      )}
      {(activeModal === 'diaper' || activeModal === 'pumping') && (
        <QuickDiaperModal
          type={activeModal}
          editRecord={editRecord}
          onClose={() => { setActiveModal(null); setEditRecord(null) }}
        />
      )}
      {activeModal === 'solids' && (
        <QuickSolidsModal editRecord={editRecord} onClose={() => { setActiveModal(null); setEditRecord(null) }} />
      )}
    </div>
  )
}

function getBabyAge(birthdate) {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  const now = new Date()
  if (isNaN(birth.getTime()) || birth > now) return null
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  let days = now.getDate() - birth.getDate()
  if (days < 0) {
    months--
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  return { months, days }
}

function SummaryCard({ icon, value, label, sub, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${bg} rounded-2xl p-3 text-left active:scale-95 transition-transform touch-manipulation`}
    >
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-base font-bold ${color} leading-tight`}>{value}</div>
      <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{sub}</div>}
    </button>
  )
}
