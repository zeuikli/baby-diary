import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { githubService, formatDate } from '../services/github'
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
  const [activeTab, setActiveTab] = useState('feeding')

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
              return ls.get(`day_${activeBabyId}_${date}`) || { date, feeding: [], sleep: [], diaper: [], pumping: [] }
            }
          } catch {
            return { date, feeding: [], sleep: [], diaper: [], pumping: [] }
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
  }))

  // Summary averages
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

  const tabs = [
    { id: 'feeding', label: '喝奶', icon: '🍼' },
    { id: 'sleep', label: '睡眠', icon: '😴' },
    { id: 'diaper', label: '尿布', icon: '🫧' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Today Summary */}
      <div className="card">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日總覽</h2>
        <div className="grid grid-cols-4 gap-2">
          <MiniStat icon="🍼" value={`${today.feeding || 0}ml`} label="奶量" />
          <MiniStat icon="😴" value={`${today.sleep || 0}h`} label="睡眠" />
          <MiniStat icon="🫧" value={`${today.diaper || 0}次`} label="尿布" />
          <MiniStat icon="🤱" value={`${today.pump || 0}ml`} label="擠奶" />
        </div>
      </div>

      {/* 7-day averages */}
      <div className="card">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">7天平均</h2>
        <div className="grid grid-cols-3 gap-3">
          <AvgCard label="每日奶量" value={`${avg(chartData, 'feeding')}ml`} icon="🍼" color="text-blue-500" />
          <AvgCard label="每日睡眠" value={`${avg(chartData, 'sleep')}h`} icon="😴" color="text-purple-500" />
          <AvgCard label="每日尿布" value={`${avg(chartData, 'diaper')}次`} icon="🫧" color="text-yellow-600" />
        </div>
      </div>

      {/* Tab charts */}
      <div className="card">
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'feeding' && (
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

        {activeTab === 'sleep' && (
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

        {activeTab === 'diaper' && (
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
      </div>
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
