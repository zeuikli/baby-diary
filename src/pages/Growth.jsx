import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { getWhoReference, estimatePercentile } from '../data/whoStandards'

function getCurrentDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

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

  // Compute baby age in months at a given date (with fractional precision)
  const getBabyAgeMonths = useCallback((recordDate) => {
    if (!activeBaby?.birthdate) return null
    const birth = new Date(activeBaby.birthdate + 'T00:00:00')
    const rec = new Date(recordDate + 'T00:00:00')
    const diffMs = rec - birth
    if (diffMs < 0) return 0
    // Average month length ~ 30.4375 days
    const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
    return Math.round(months * 10) / 10
  }, [activeBaby])

  const tabs = [
    { id: 'weight', label: '體重', icon: '⚖️', unit: 'kg', dataKey: 'weight', color: '#f472b6' },
    { id: 'height', label: '身高', icon: '📏', unit: 'cm', dataKey: 'height', color: '#60a5fa' },
    { id: 'headCirc', label: '頭圍', icon: '🧢', unit: 'cm', dataKey: 'headCirc', color: '#34d399' },
  ]

  const activeTabConfig = tabs.find(t => t.id === activeTab)

  // Latest value per metric — each metric finds its own most recent non-null
  // record, paired with its estimated WHO percentile at that record's age.
  const latestByMetric = useMemo(() => {
    const gender = activeBaby?.gender
    const pick = (key, metricId) => {
      for (let i = records.length - 1; i >= 0; i--) {
        const r = records[i]
        if (r[key] != null && r[key] !== '') {
          const age = getBabyAgeMonths(r.date)
          const pct = estimatePercentile(metricId, gender, age, r[key])
          return { record: r, percentile: pct }
        }
      }
      return null
    }
    return {
      weight: pick('weight', 'weight'),
      height: pick('height', 'height'),
      headCirc: pick('headCirc', 'headCirc'),
    }
  }, [records, activeBaby, getBabyAgeMonths])

  const hasAnyLatest = latestByMetric.weight || latestByMetric.height || latestByMetric.headCirc

  // Build merged chart data: WHO reference points + baby records, indexed by
  // age (months). Both the WHO reference curves and baby records are clipped
  // to the 0-24 month chart window so the dashed lines don't extend beyond it.
  const CHART_MAX_AGE = 24
  const chartData = useMemo(() => {
    const whoRef = getWhoReference(activeTab, activeBaby?.gender)
    const map = new Map()
    // WHO reference points within 0-24 months
    whoRef
      .filter(d => d.age <= CHART_MAX_AGE)
      .forEach(d => {
        map.set(d.age, { age: d.age, p3: d.p3, p50: d.p50, p97: d.p97 })
      })
    // Baby records within 0-24 months (only those with a value for the active metric)
    records.forEach(r => {
      const val = r[activeTabConfig.dataKey]
      if (val == null || val === '') return
      const age = getBabyAgeMonths(r.date)
      if (age == null || age > CHART_MAX_AGE) return
      const existing = map.get(age) || { age }
      map.set(age, { ...existing, baby: val, recordDate: r.date })
    })
    return Array.from(map.values()).sort((a, b) => a.age - b.age)
  }, [records, activeTab, activeTabConfig.dataKey, activeBaby, getBabyAgeMonths])

  const babyPointCount = chartData.filter(d => d.baby != null).length

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Latest stats — each metric shows its own most recent value, date
          and estimated WHO percentile */}
      {hasAnyLatest && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">最新數值</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon="⚖️"
              value={latestByMetric.weight ? `${latestByMetric.weight.record.weight}kg` : '—'}
              label="體重"
              date={latestByMetric.weight?.record.date}
              percentile={latestByMetric.weight?.percentile}
              color="text-pink-500"
            />
            <StatCard
              icon="📏"
              value={latestByMetric.height ? `${latestByMetric.height.record.height}cm` : '—'}
              label="身高"
              date={latestByMetric.height?.record.date}
              percentile={latestByMetric.height?.percentile}
              color="text-blue-500"
            />
            <StatCard
              icon="🧢"
              value={latestByMetric.headCirc ? `${latestByMetric.headCirc.record.headCirc}cm` : '—'}
              label="頭圍"
              date={latestByMetric.headCirc?.record.date}
              percentile={latestByMetric.headCirc?.percentile}
              color="text-green-500"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
            百分位依 WHO 0-5 歲國際生長標準推算（對照寶寶性別與月齡）
          </p>
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

        {babyPointCount === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">📈</p>
            <p>尚未有{activeTabConfig.label}記錄</p>
            <p className="text-xs mt-1">新增記錄後即可對照 WHO 生長曲線</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="age"
                  type="number"
                  domain={[0, 24]}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  label={{ value: '月齡', position: 'insideBottomRight', offset: -2, fontSize: 11, fill: '#9ca3af' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #fce7f3', fontSize: 12 }}
                  labelFormatter={(age) => `${age} 個月`}
                  formatter={(val, name) => {
                    if (val == null) return null
                    const labelMap = { baby: activeTabConfig.label, p3: 'WHO 3%', p50: 'WHO 50%', p97: 'WHO 97%' }
                    return [`${val}${activeTabConfig.unit}`, labelMap[name] || name]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                {/* WHO percentile reference curves */}
                <Line
                  type="monotone" dataKey="p97" name="WHO 97%"
                  stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4"
                  dot={false} activeDot={false} connectNulls isAnimationActive={false}
                />
                <Line
                  type="monotone" dataKey="p50" name="WHO 50%"
                  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 4"
                  dot={false} activeDot={false} connectNulls isAnimationActive={false}
                />
                <Line
                  type="monotone" dataKey="p3" name="WHO 3%"
                  stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4"
                  dot={false} activeDot={false} connectNulls isAnimationActive={false}
                />
                {/* Baby's own data */}
                <Line
                  type="monotone" dataKey="baby" name={activeTabConfig.label}
                  stroke={activeTabConfig.color} strokeWidth={2.5}
                  dot={{ fill: activeTabConfig.color, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
              虛線為世界衛生組織 (WHO) 公布之國際嬰幼兒生長標準百分位曲線 (P3 / P50 / P97)，顯示 0-24 個月區間，依寶寶性別自動對應。
            </p>
          </>
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

function StatCard({ icon, value, label, color, date, percentile }) {
  const pctLabel = percentile != null
    ? (percentile.startsWith('<') || percentile.startsWith('>') ? `${percentile}%` : `P${percentile}`)
    : null
  return (
    <div className="text-center bg-gray-50 rounded-xl p-2">
      <div className="text-lg">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
      {pctLabel && (
        <div className={`text-[10px] font-semibold mt-0.5 ${color}`}>{pctLabel}</div>
      )}
      {date && <div className="text-[10px] text-gray-400 mt-0.5">{date.slice(5)}</div>}
    </div>
  )
}
