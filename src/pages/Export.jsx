import React, { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { githubService } from '../services/github'
import { ls } from '../services/localStorage'
import toast from 'react-hot-toast'

// Translate internal enum values to Traditional Chinese for CSV readability
const FEED_TYPE_ZH = { breast: '親餵', bottle: '瓶餵', pumped: '母乳瓶餵' }
const DIAPER_TYPE_ZH = { wet: '尿尿', dirty: '便便', mixed: '混合', dry: '乾淨' }
const SIDE_ZH = { left: '左側', right: '右側', both: '雙側' }
const zh = (map, val) => map[val] || val || ''

// CSV column definitions per record type — headers in Traditional Chinese
const EXPORT_TYPES = [
  { id: 'feeding',  label: '喝奶',   icon: '🍼',
    cols: ['日期','時間','類型','奶量(ml)','時長(分鐘)','側邊','備註'],
    row: (date, r) => [date, r.time||'', zh(FEED_TYPE_ZH, r.feedType), r.amount??'', r.duration??'', zh(SIDE_ZH, r.side), r.notes||''] },
  { id: 'sleep',    label: '睡眠',   icon: '😴',
    cols: ['日期','開始','結束','備註'],
    row: (date, r) => [date, r.start||'', r.end||'', r.notes||''] },
  { id: 'diaper',   label: '尿布',   icon: '🫧',
    cols: ['日期','時間','類型','顏色','備註'],
    row: (date, r) => [date, r.time||'', zh(DIAPER_TYPE_ZH, r.diaperType), r.color||'', r.notes||''] },
  { id: 'pumping',  label: '擠奶',   icon: '🤱',
    cols: ['日期','時間','側邊','奶量(ml)','時長(分鐘)','備註'],
    row: (date, r) => [date, r.time||'', zh(SIDE_ZH, r.side), r.amount??'', r.duration??'', r.notes||''] },
  { id: 'solids',   label: '副食品', icon: '🥣',
    cols: ['日期','時間','食物','食量(ml)','反應','備註'],
    row: (date, r) => [date, r.time||'', r.food||'', r.amount??'', r.reaction||'', r.notes||''] },
  { id: 'growth',   label: '成長',   icon: '📏',
    cols: ['日期','體重(kg)','身高(cm)','頭圍(cm)','備註'],
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

  // "全部匯出" — merges all types into ONE CSV with a record_type column,
  // avoiding the multiple-download browser blocking issue.
  const ALL_COLS = ['記錄類型','日期','時間','開始','結束','類型','奶量(ml)','時長(分鐘)','側邊','食物','食量(ml)','反應','顏色','體重(kg)','身高(cm)','頭圍(cm)','備註']

  const handleExportAll = useCallback(async () => {
    if (!activeBabyId) { toast.error('請先選擇寶寶'); return }
    setLoading(true)
    try {
      const days = await fetchAllDays()
      const sortedDays = days.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const babyName = activeBaby?.name || 'baby'
      const allRows = []

      // Daily record types
      for (const day of sortedDays) {
        // feeding
        const feedings = Array.isArray(day.feeding) ? day.feeding.filter(Boolean) : []
        feedings.forEach(r => allRows.push(['喝奶', day.date, r.time||'', '', '', zh(FEED_TYPE_ZH, r.feedType), r.amount??'', r.duration??'', zh(SIDE_ZH, r.side), '', '', '', '', '', '', '', r.notes||'']))
        // sleep
        const sleeps = Array.isArray(day.sleep) ? day.sleep.filter(Boolean) : []
        sleeps.forEach(r => allRows.push(['睡眠', day.date, '', r.start||'', r.end||'', '', '', '', '', '', '', '', '', '', '', '', r.notes||'']))
        // diaper
        const diapers = Array.isArray(day.diaper) ? day.diaper.filter(Boolean) : []
        diapers.forEach(r => allRows.push(['尿布', day.date, r.time||'', '', '', zh(DIAPER_TYPE_ZH, r.diaperType), '', '', '', '', '', '', r.color||'', '', '', '', r.notes||'']))
        // pumping
        const pumpings = Array.isArray(day.pumping) ? day.pumping.filter(Boolean) : []
        pumpings.forEach(r => allRows.push(['擠奶', day.date, r.time||'', '', '', '', r.amount??'', r.duration??'', zh(SIDE_ZH, r.side), '', '', '', '', '', '', '', r.notes||'']))
        // solids
        const solids = Array.isArray(day.solids) ? day.solids.filter(Boolean) : []
        solids.forEach(r => allRows.push(['副食品', day.date, r.time||'', '', '', '', '', '', '', r.food||'', r.amount??'', r.reaction||'', '', '', '', '', r.notes||'']))
      }

      // Growth records (stored separately)
      setProgress('讀取成長記錄...')
      let growthRecs = []
      if (githubService.isConfigured) {
        growthRecs = await githubService.getGrowthRecords(activeBabyId)
      } else {
        growthRecs = ls.get(`growth_${activeBabyId}`) || []
      }
      ;(Array.isArray(growthRecs) ? growthRecs : [])
        .filter(Boolean)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .forEach(r => allRows.push(['成長', r.date||'', '', '', '', '', '', '', '', '', '', '', '', r.weight??'', r.height??'', r.headCirc??'', r.notes||'']))

      if (allRows.length === 0) {
        toast.error('沒有任何記錄可以匯出')
      } else {
        const dateStr = new Date().toISOString().slice(0, 10)
        downloadCSV(`${babyName}_all_${dateStr}.csv`, ALL_COLS, allRows)
        toast.success(`已匯出 ${allRows.length} 筆記錄`)
      }
    } catch (e) {
      console.error('Export all error:', e)
      toast.error(`全部匯出失敗：${e.message || '未知錯誤'}`)
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
