import React, { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { githubService } from '../services/github'
import { ls } from '../services/localStorage'
import toast from 'react-hot-toast'

// CSV column definitions per record type — matches Import.jsx format for round-trip
const EXPORT_TYPES = [
  { id: 'feeding',  label: '喝奶',   icon: '🍼',
    cols: ['date','time','type','amount_ml','duration_min','side','notes'],
    row: (date, r) => [date, r.time||'', r.feedType||'', r.amount??'', r.duration??'', r.side||'', r.notes||''] },
  { id: 'sleep',    label: '睡眠',   icon: '😴',
    cols: ['date','start','end','notes'],
    row: (date, r) => [date, r.start||'', r.end||'', r.notes||''] },
  { id: 'diaper',   label: '尿布',   icon: '🫧',
    cols: ['date','time','type','color','notes'],
    row: (date, r) => [date, r.time||'', r.diaperType||'', r.color||'', r.notes||''] },
  { id: 'pumping',  label: '擠奶',   icon: '🤱',
    cols: ['date','time','side','amount_ml','duration_min','notes'],
    row: (date, r) => [date, r.time||'', r.side||'', r.amount??'', r.duration??'', r.notes||''] },
  { id: 'solids',   label: '副食品', icon: '🥣',
    cols: ['date','time','food','reaction','notes'],
    row: (date, r) => [date, r.time||'', r.food||'', r.reaction||'', r.notes||''] },
  { id: 'growth',   label: '成長',   icon: '📏',
    cols: ['date','weight_kg','height_cm','head_cm','notes'],
    row: (_, r) => [r.date||'', r.weight??'', r.height??'', r.headCirc??'', r.notes||''] },
]

function escapeCSV(val) {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCSV(filename, headerRow, dataRows) {
  const lines = [headerRow.join(',')]
  dataRows.forEach(row => lines.push(row.map(escapeCSV).join(',')))
  // BOM for Excel to recognise UTF-8
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function Export() {
  const { activeBabyId, activeBaby } = useApp()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  // Gather all daily records for the active baby across all stored dates
  const fetchAllDays = useCallback(async () => {
    if (!activeBabyId) return []

    if (githubService.isConfigured) {
      const days = []
      const birth = activeBaby?.birthdate
        ? new Date(activeBaby.birthdate + 'T00:00:00')
        : new Date(new Date().getFullYear(), 0, 1)
      const now = new Date()
      let cursor = new Date(birth.getFullYear(), birth.getMonth(), 1)

      const months = []
      while (cursor <= now) {
        months.push({ y: cursor.getFullYear(), m: cursor.getMonth() + 1 })
        cursor.setMonth(cursor.getMonth() + 1)
      }

      for (let i = 0; i < months.length; i++) {
        const { y, m } = months[i]
        setProgress(`讀取 ${y}-${String(m).padStart(2, '0')}  (${i + 1}/${months.length})`)
        const recs = await githubService.getMonthRecords(activeBabyId, y, m)
        days.push(...recs)
      }
      return days
    } else {
      // localStorage: find all day_<babyId>_* keys
      const prefix = `day_${activeBabyId}_`
      return ls.keys()
        .filter(k => k.startsWith(prefix))
        .map(k => ls.get(k))
        .filter(Boolean)
    }
  }, [activeBabyId, activeBaby])

  const handleExport = useCallback(async (typeConfig) => {
    if (!activeBabyId) { toast.error('請先選擇寶寶'); return }
    setLoading(true)
    setProgress('準備中...')

    try {
      let dataRows = []
      const babyName = activeBaby?.name || 'baby'

      if (typeConfig.id === 'growth') {
        // Growth records are stored separately
        setProgress('讀取成長記錄...')
        let records = []
        if (githubService.isConfigured) {
          records = await githubService.getGrowthRecords(activeBabyId)
        } else {
          records = ls.get(`growth_${activeBabyId}`) || []
        }
        dataRows = (Array.isArray(records) ? records : [])
          .filter(Boolean)
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .map(r => typeConfig.row('', r))
      } else {
        // Fetch all daily records then flatten the specific type
        const days = await fetchAllDays()
        days
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .forEach(day => {
            const arr = day[typeConfig.id]
            const recs = Array.isArray(arr) ? arr.filter(Boolean) : []
            recs.forEach(r => {
              dataRows.push(typeConfig.row(day.date, r))
            })
          })
      }

      if (dataRows.length === 0) {
        toast.error(`沒有${typeConfig.label}記錄可以匯出`)
        return
      }

      const filename = `${babyName}_${typeConfig.id}_${new Date().toISOString().slice(0, 10)}.csv`
      downloadCSV(filename, typeConfig.cols, dataRows)
      toast.success(`已匯出 ${dataRows.length} 筆${typeConfig.label}記錄`)
    } catch (e) {
      console.error('Export error:', e)
      toast.error(`匯出${typeConfig.label}失敗：${e.message || '未知錯誤'}`)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [activeBabyId, activeBaby, fetchAllDays])

  const handleExportAll = useCallback(async () => {
    if (!activeBabyId) { toast.error('請先選擇寶寶'); return }
    setLoading(true)
    try {
      // Fetch daily records once, reuse for all non-growth types
      const days = await fetchAllDays()
      const babyName = activeBaby?.name || 'baby'
      const dateStr = new Date().toISOString().slice(0, 10)
      let totalCount = 0

      for (const typeConfig of EXPORT_TYPES) {
        let dataRows = []
        if (typeConfig.id === 'growth') {
          setProgress('讀取成長記錄...')
          let records = []
          if (githubService.isConfigured) {
            records = await githubService.getGrowthRecords(activeBabyId)
          } else {
            records = ls.get(`growth_${activeBabyId}`) || []
          }
          dataRows = (Array.isArray(records) ? records : [])
            .filter(Boolean)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map(r => typeConfig.row('', r))
        } else {
          days
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .forEach(day => {
              const arr = day[typeConfig.id]
              const recs = Array.isArray(arr) ? arr.filter(Boolean) : []
              recs.forEach(r => dataRows.push(typeConfig.row(day.date, r)))
            })
        }
        if (dataRows.length > 0) {
          downloadCSV(`${babyName}_${typeConfig.id}_${dateStr}.csv`, typeConfig.cols, dataRows)
          totalCount += dataRows.length
        }
      }

      if (totalCount === 0) {
        toast.error('沒有任何記錄可以匯出')
      } else {
        toast.success(`已匯出 ${totalCount} 筆記錄`)
      }
    } catch (e) {
      console.error(e)
      toast.error('匯出失敗，請稍後重試')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [activeBabyId, activeBaby, fetchAllDays])

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">CSV 資料匯出</h2>
        <p className="text-xs text-gray-400 mb-4">
          匯出{activeBaby?.name ? ` ${activeBaby.name} 的` : ''}所有記錄為 CSV，格式與匯入相同，可供備份或轉移到其他 App。
        </p>

        {/* Export all */}
        <button
          onClick={handleExportAll}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl bg-pink-500 text-white text-sm font-medium active:scale-95 transition-transform touch-manipulation disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {loading ? (progress || '匯出中...') : '全部匯出'}
        </button>

        {/* Per-type exports */}
        <p className="text-xs text-gray-400 mb-2">或選擇個別類型匯出：</p>
        <div className="grid grid-cols-3 gap-2">
          {EXPORT_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => handleExport(t)}
              disabled={loading}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 active:scale-95 transition-transform touch-manipulation disabled:opacity-50"
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400 leading-relaxed px-1">
        <p>• CSV 以 UTF-8 BOM 編碼，可用 Excel、Google Sheets 或 Numbers 開啟</p>
        <p>• 匯出格式與匯入格式完全相同，可直接匯回本 App 或其他應用</p>
      </div>
    </div>
  )
}
