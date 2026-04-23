import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { githubService, formatDate, createEmptyDay } from '../services/github'
import { ls } from '../services/localStorage'

function getPast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(formatDate(d))
  }
  return days
}

const COLORS = ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24']

function calcSleepMins(records) {
  return (records || []).reduce((s, r) => {
    if (!r.end) return s
    const start = new Date(`2000-01-01T${r.start}`)
    const end = new Date(`2000-01-01T${r.end}`)
    let diff = (end - start) / 60000
    if (diff < 0) diff += 24 * 60
    return s + diff
  }, 0)
}

export default function Stats() {
  const { activeBabyId, isGitHubConfigured } = useApp()
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(null)

  const loadWeekData = useCallback(async () => {
    if (!activeBabyId) return
    setLoading(true)
    try {
      const days = getPast7Days()
      const records = await Promise.all(
        days.map(async (date) => {
          try {
            if (githubService.isConfigured) {
              return await githubService.getDayRecord(activeBabyId, date)
            } else {
              return ls.get(`day_${activeBabyId}_${date}`) || createEmptyDay(date, activeBabyId)
            }
          } catch {
            return createEmptyDay(date, activeBabyId)
          }
        })
      )
      setWeekData(records)
    } finally {
      setLoading(false)
    }
  }, [activeBabyId, isGitHubConfigured])

  useEffect(() => { loadWeekData() }, [loadWeekData])

  const chartData = weekData.map(r => ({
    date: r.date?.slice(5) || '',
    feeding: (r.feeding || []).reduce((s, f) => s + (f.amount || 0), 0),
    feedCount: (r.feeding || []).length,
    sleep: Math.round(calcSleepMins(r.sleep || []) / 60 * 10) / 10,
    sleepCount: (r.sleep || []).filter(s => s.end).length,
    diaper: (r.diaper || []).length,
    wet: (r.diaper || []).filter(d => d.diaperType === 'wet' || d.diaperType === 'mixed').length,
    dirty: (r.diaper || []).filter(d => d.diaperType === 'dirty' || d.diaperType === 'mixed').length,
    pump: (r.pumping || []).reduce((s, p) => s + (p.amount || 0), 0),
    pumpCount: (r.pumping || []).length,
    solids: (r.solids || []).length,
  }))

  // Detect which types have any data in the 7-day window
  const hasFeeding = chartData.some(d => d.feedCount > 0)
  const hasSleep = chartData.some(d => d.sleepCount > 0)
  const hasDiaper = chartData.some(d => d.diaper > 0)
  const hasPumping = chartData.some(d => d.pumpCount > 0)
  const hasSolids = chartData.some(d => d.solids > 0)

  // Build tabs dynamically based on available data
  const tabs = []
  if (hasFeeding) tabs.push({ id: 'feeding', label: '喝奶', icon: '🍼' })
  if (hasSleep)   tabs.push({ id: 'sleep',   label: '睡眠', icon: '😴' })
  if (hasDiaper)  tabs.push({ id: 'diaper',  label: '尿布', icon: '🫧' })
  if (hasPumping) tabs.push({ id: 'pumping', label: '擠奶', icon: '🤱' })
  if (hasSolids)  tabs.push({ id: 'solids',  label: '副食品', icon: '🥣' })

  // Auto-select first available tab
  const currentTab = activeTab && tabs.some(t => t.id === activeTab) ? activeTab : tabs[0]?.id

  const avg = (arr, key) => arr.length ? Math.round(arr.reduce((s, d) => s + d[key], 0) / arr.length * 10) / 10 : 0

  const today = chartData[chartData.length - 1] || {}

  const feedTypeData = weekData.reduce((acc, r) => {
    (r.feeding || []).forEach(f => {
      const type = f.feedType === 'breast' ? '親餵' : f.feedType === 'pumped' ? '母乳瓶' : '瓶餵'
      const found = acc.find(a => a.name === type)
      if (found) found.value++
      else acc.push({ name: type, value: 1 })
    })
    return acc
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Today Summary — only items with data */}
      {(() => {
        const items = []
        if (today.feedCount > 0) items.push(<MiniStat key="f" icon="🍼" value={`${today.feeding}ml`} label="奶量" />)
        if (today.sleepCount > 0 || today.sleep > 0) items.push(<MiniStat key="s" icon="😴" value={`${today.sleep}h`} label="睡眠" />)
        if (today.diaper > 0) items.push(<MiniStat key="d" icon="🫧" value={`${today.diaper}次`} label="尿布" />)
        if (today.pumpCount > 0) items.push(<MiniStat key="p" icon="🤱" value={`${today.pump}ml`} label="擠奶" />)
        if (today.solids > 0) items.push(<MiniStat key="so" icon="🥣" value={`${today.solids}次`} label="副食品" />)
        if (items.length === 0) return null
        return (
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日總覽</h2>
            <div className={`grid gap-2 ${items.length <= 3 ? 'grid-cols-3' : items.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>{items}</div>
          </div>
        )
      })()}

      {/* 7-day averages — only items with data */}
      {(() => {
        const items = []
        if (hasFeeding) items.push(<AvgCard key="f" label="每日奶量" value={`${avg(chartData, 'feeding')}ml`} icon="🍼" color="text-blue-500" />)
        if (hasSleep)   items.push(<AvgCard key="s" label="每日睡眠" value={`${avg(chartData, 'sleep')}h`} icon="😴" color="text-purple-500" />)
        if (hasDiaper)  items.push(<AvgCard key="d" label="每日尿布" value={`${avg(chartData, 'diaper')}次`} icon="🫧" color="text-amber-500" />)
        if (hasPumping) items.push(<AvgCard key="p" label="每日擠奶" value={`${avg(chartData, 'pump')}ml`} icon="🤱" color="text-pink-500" />)
        if (hasSolids)  items.push(<AvgCard key="so" label="每日副食品" value={`${avg(chartData, 'solids')}次`} icon="🥣" color="text-green-500" />)
        if (items.length === 0) return null
        return (
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">7天平均</h2>
            <div className={`grid gap-3 ${items.length <= 3 ? 'grid-cols-3' : items.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>{items}</div>
          </div>
        )
      })()}

      {/* Tab charts — only tabs with data */}
      {tabs.length > 0 && (
        <div className="card">
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation ${currentTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {currentTab === 'feeding' && (
            <>
              <p className="text-xs text-gray-400 mb-2">每日奶量 (ml)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} formatter={(v) => [`${v}ml`, '奶量']} />
                  <Bar dataKey="feeding" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {feedTypeData.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">餵食方式分佈</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={feedTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                        {feedTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {currentTab === 'sleep' && (
            <>
              <p className="text-xs text-gray-400 mb-2">每日睡眠時數 (h)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} formatter={(v) => [`${v}小時`, '睡眠']} />
                  <Bar dataKey="sleep" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {currentTab === 'diaper' && (
            <>
              <p className="text-xs text-gray-400 mb-2">每日尿布次數</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                  <Bar dataKey="wet" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} name="尿尿" />
                  <Bar dataKey="dirty" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="便便" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {currentTab === 'pumping' && (
            <>
              <p className="text-xs text-gray-400 mb-2">每日擠奶量 (ml)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} formatter={(v) => [`${v}ml`, '擠奶']} />
                  <Bar dataKey="pump" fill="#f472b6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {currentTab === 'solids' && (
            <>
              <p className="text-xs text-gray-400 mb-2">每日副食品次數</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} formatter={(v) => [`${v}次`, '副食品']} />
                  <Bar dataKey="solids" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {tabs.length === 0 && (
        <div className="card text-center py-8 text-gray-400 text-sm">
          <p className="text-3xl mb-2">📊</p>
          <p>過去 7 天沒有任何紀錄</p>
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="text-center bg-gray-50 rounded-xl p-2">
      <div className="text-lg">{icon}</div>
      <div className="text-sm font-bold text-gray-800 leading-tight">{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  )
}

function AvgCard({ icon, value, label, color }) {
  return (
    <div className="text-center">
      <div className="text-xl">{icon}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
