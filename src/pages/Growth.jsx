import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { githubService, generateId } from '../services/github'
import { ls } from '../services/localStorage'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

function getCurrentDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// WHO growth reference curves (simplified)
const WHO_WEIGHT_GIRLS = [
  { age: 0, p3: 2.4, p50: 3.2, p97: 4.2 },
  { age: 1, p3: 3.2, p50: 4.2, p97: 5.5 },
  { age: 2, p3: 4.0, p50: 5.1, p97: 6.6 },
  { age: 3, p3: 4.6, p50: 5.8, p97: 7.5 },
  { age: 6, p3: 5.7, p50: 7.3, p97: 9.3 },
  { age: 9, p3: 6.7, p50: 8.2, p97: 10.4 },
  { age: 12, p3: 7.1, p50: 9.0, p97: 11.5 },
]
const WHO_WEIGHT_BOYS = [
  { age: 0, p3: 2.5, p50: 3.3, p97: 4.4 },
  { age: 1, p3: 3.4, p50: 4.5, p97: 5.8 },
  { age: 2, p3: 4.3, p50: 5.6, p97: 7.1 },
  { age: 3, p3: 5.1, p50: 6.4, p97: 8.0 },
  { age: 6, p3: 6.4, p50: 7.9, p97: 9.7 },
  { age: 9, p3: 7.2, p50: 9.0, p97: 11.0 },
  { age: 12, p3: 7.8, p50: 9.9, p97: 12.0 },
]

export default function Growth() {
  const { activeBabyId, activeBaby, isGitHubConfigured } = useApp()
  const [records, setRecords] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date: getCurrentDate(), weight: '', height: '', headCirc: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('weight')
  const [loading, setLoading] = useState(false)

  const loadRecords = useCallback(async () => {
    if (!activeBabyId) return
    setLoading(true)
    try {
      let data = []
      if (githubService.isConfigured) {
        data = await githubService.getGrowthRecords(activeBabyId)
      } else {
        data = ls.get(`growth_${activeBabyId}`) || []
      }
      setRecords(data.sort((a, b) => a.date.localeCompare(b.date)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeBabyId])

  useEffect(() => { loadRecords() }, [loadRecords])

  const handleSave = async () => {
    if (!form.weight && !form.height) {
      toast.error('請至少填入體重或身高')
      return
    }
    setSaving(true)
    try {
      const record = {
        id: generateId(),
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        headCirc: form.headCirc ? parseFloat(form.headCirc) : null,
        notes: form.notes,
      }

      let updated
      if (githubService.isConfigured) {
        updated = await githubService.addGrowthRecord(activeBabyId, record)
      } else {
        updated = [...records, record].sort((a, b) => a.date.localeCompare(b.date))
        ls.set(`growth_${activeBabyId}`, updated)
      }
      setRecords(updated)
      toast.success('成長記錄已新增 📏')
      setShowModal(false)
      setForm({ date: getCurrentDate(), weight: '', height: '', headCirc: '', notes: '' })
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除？')) return
    const updated = records.filter(r => r.id !== id)
    setRecords(updated)
    if (githubService.isConfigured) {
      await githubService.putFile(`${activeBabyId}/growth.json`, updated, 'Delete growth record')
    } else {
      ls.set(`growth_${activeBabyId}`, updated)
    }
    toast.success('已刪除')
  }

  // Compute baby age in months at each record
  const getBabyAge = (recordDate) => {
    if (!activeBaby?.birthdate) return null
    const birth = new Date(activeBaby.birthdate + 'T00:00:00')
    const rec = new Date(recordDate + 'T00:00:00')
    const months = (rec.getFullYear() - birth.getFullYear()) * 12 + (rec.getMonth() - birth.getMonth())
    return Math.max(0, months)
  }

  const chartData = records.map(r => ({
    date: r.date.slice(5), // MM-DD
    age: getBabyAge(r.date),
    weight: r.weight,
    height: r.height,
    headCirc: r.headCirc,
  }))

  const whoData = activeBaby?.gender === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS

  const tabs = [
    { id: 'weight', label: '體重', icon: '⚖️', unit: 'kg', dataKey: 'weight', color: '#f472b6' },
    { id: 'height', label: '身高', icon: '📏', unit: 'cm', dataKey: 'height', color: '#60a5fa' },
    { id: 'headCirc', label: '頭圍', icon: '🧢', unit: 'cm', dataKey: 'headCirc', color: '#34d399' },
  ]

  const activeTabConfig = tabs.find(t => t.id === activeTab)
  const latest = records[records.length - 1]

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Latest stats */}
      {latest && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">最新數值</h2>
          <div className="grid grid-cols-3 gap-3">
            {latest.weight && <StatCard icon="⚖️" value={`${latest.weight}kg`} label="體重" color="text-pink-500" />}
            {latest.height && <StatCard icon="📏" value={`${latest.height}cm`} label="身高" color="text-blue-500" />}
            {latest.headCirc && <StatCard icon="🧢" value={`${latest.headCirc}cm`} label="頭圍" color="text-green-500" />}
          </div>
          <p className="text-xs text-gray-400 mt-2">記錄於 {latest.date}</p>
        </div>
      )}

      {/* Chart tabs */}
      <div className="card">
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation ${
                activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {chartData.filter(d => d[activeTabConfig.dataKey]).length < 2 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">📈</p>
            <p>至少需要 2 筆記錄才能顯示圖表</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData.filter(d => d[activeTabConfig.dataKey])} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #fce7f3', fontSize: 12 }}
                formatter={(val) => [`${val}${activeTabConfig.unit}`, activeTabConfig.label]}
              />
              <Line
                type="monotone"
                dataKey={activeTabConfig.dataKey}
                stroke={activeTabConfig.color}
                strokeWidth={2.5}
                dot={{ fill: activeTabConfig.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Records list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">記錄列表</h2>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 text-xs text-pink-500 font-medium px-2 py-1 bg-pink-50 rounded-lg touch-manipulation">
            <Plus size={14} /> 新增
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="📏" title="還沒有成長記錄" action={{ label: '新增記錄', onClick: () => setShowModal(true) }} />
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...records].reverse().map((record, idx) => (
              <div key={record.id} className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📏</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{record.date}</p>
                  <p className="text-xs text-gray-400">
                    {[record.weight ? `${record.weight}kg` : null, record.height ? `${record.height}cm` : null, record.headCirc ? `頭${record.headCirc}cm` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 touch-manipulation">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-orange-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {/* Add modal */}
      <Modal isOpen={showModal} title="新增成長記錄" onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="form-label">日期</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">體重 (kg)</label>
              <input type="number" step="0.1" placeholder="5.2" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="form-input" inputMode="decimal" />
            </div>
            <div>
              <label className="form-label">身高 (cm)</label>
              <input type="number" step="0.1" placeholder="58.5" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} className="form-input" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label className="form-label">頭圍 (cm)</label>
            <input type="number" step="0.1" placeholder="38.5" value={form.headCirc} onChange={e => setForm(f => ({ ...f, headCirc: e.target.value }))} className="form-input" inputMode="decimal" />
          </div>
          <div>
            <label className="form-label">備註</label>
            <textarea placeholder="健康狀況備註..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="form-input resize-none" rows={2} />
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full btn-primary py-3">
            {saving ? '儲存中...' : '儲存記錄'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="text-center bg-gray-50 rounded-xl p-2">
      <div className="text-lg">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
