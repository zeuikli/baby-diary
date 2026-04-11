import React, { useState, useRef } from 'react'
import { Upload, Download, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { githubService, generateId, createEmptyDay } from '../services/github'
import { ls } from '../services/localStorage'
import toast from 'react-hot-toast'

// ─── CSV Parsing ────────────────────────────────────────────

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      values.push(current); current = ''
    } else {
      current += ch
    }
  }
  values.push(current)
  return values
}

function parseCSV(text) {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, '')
  const lines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nonEmpty = lines.filter(l => l.trim())
  if (nonEmpty.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(nonEmpty[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = nonEmpty.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim() })
    return row
  }).filter(row => Object.values(row).some(v => v))
  return { headers, rows }
}

// ─── Record Configs ─────────────────────────────────────────

const RECORD_TYPES = {
  feeding: {
    label: '喝奶記錄',
    icon: '🍼',
    sample: [
      ['date', 'time', 'type', 'amount_ml', 'duration_min', 'side', 'notes'],
      ['2026-04-11', '08:30', 'breast', '', '15', 'left', ''],
      ['2026-04-11', '11:00', 'bottle', '120', '', '', '牛奶'],
      ['2026-04-11', '14:30', 'pumped', '80', '20', 'both', ''],
    ],
    hint: 'type: breast(親餵) / bottle(瓶餵) / pumped(母乳瓶餵)　side: left / right / both',
  },
  sleep: {
    label: '睡眠記錄',
    icon: '😴',
    sample: [
      ['date', 'start', 'end', 'notes'],
      ['2026-04-11', '13:00', '14:30', '午睡'],
      ['2026-04-11', '20:30', '23:00', ''],
      ['2026-04-11', '23:30', '04:00', '跨午夜填同一天日期'],
    ],
    hint: '跨午夜的睡眠：end 比 start 小時系統自動識別為隔天結束',
  },
  diaper: {
    label: '尿布記錄',
    icon: '🫧',
    sample: [
      ['date', 'time', 'type', 'notes'],
      ['2026-04-11', '09:15', 'wet', ''],
      ['2026-04-11', '13:00', 'dirty', ''],
      ['2026-04-11', '17:30', 'mixed', ''],
    ],
    hint: 'type: wet(尿尿) / dirty(便便) / mixed(混合) / dry(乾淨)',
  },
  growth: {
    label: '成長記錄',
    icon: '📏',
    sample: [
      ['date', 'weight_kg', 'height_cm', 'head_cm', 'notes'],
      ['2026-04-01', '3.3', '50.5', '34.0', '出生記錄'],
      ['2026-04-15', '4.1', '53.5', '36.0', ''],
      ['2026-05-01', '5.2', '57.0', '38.0', '一個月健診'],
    ],
    hint: 'weight_kg(體重)、height_cm(身高)、head_cm(頭圍) 至少填一項',
  },
}

// ─── Row Converters ─────────────────────────────────────────

const FEED_TYPE_MAP = {
  breast: 'breast', 親餵: 'breast', breastfeed: 'breast', breastfeeding: 'breast',
  bottle: 'bottle', 瓶餵: 'bottle', formula: 'bottle',
  pumped: 'pumped', 母乳: 'pumped', 母乳瓶餵: 'pumped', 'pumped milk': 'pumped',
}
const SIDE_MAP = {
  left: 'left', 左: 'left', 左側: 'left',
  right: 'right', 右: 'right', 右側: 'right',
  both: 'both', 雙: 'both', 雙側: 'both',
}
const DIAPER_TYPE_MAP = {
  wet: 'wet', 尿尿: 'wet', urine: 'wet', pee: 'wet',
  dirty: 'dirty', 便便: 'dirty', poop: 'dirty', bm: 'dirty', stool: 'dirty',
  mixed: 'mixed', 混合: 'mixed',
  dry: 'dry', 乾淨: 'dry', clean: 'dry',
}

function getCol(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function rowToFeeding(row) {
  return {
    id: generateId(),
    time: getCol(row, 'time', '時間', 'start_time'),
    feedType: FEED_TYPE_MAP[(getCol(row, 'type', '類型', 'feed_type') || '').toLowerCase()] || 'bottle',
    amount: toNum(getCol(row, 'amount_ml', 'amount', '奶量', 'ml')),
    duration: toNum(getCol(row, 'duration_min', 'duration', '時長', 'minutes')),
    side: SIDE_MAP[(getCol(row, 'side', '側邊') || '').toLowerCase()] || null,
    notes: getCol(row, 'notes', '備註', 'note'),
  }
}

function rowToSleep(row) {
  return {
    id: generateId(),
    start: getCol(row, 'start', '開始', 'start_time', 'begin'),
    end: getCol(row, 'end', '結束', 'end_time', 'finish'),
    notes: getCol(row, 'notes', '備註', 'note'),
  }
}

function rowToDiaper(row) {
  return {
    id: generateId(),
    time: getCol(row, 'time', '時間'),
    diaperType: DIAPER_TYPE_MAP[(getCol(row, 'type', '類型', 'diaper_type') || 'wet').toLowerCase()] || 'wet',
    notes: getCol(row, 'notes', '備註', 'note'),
  }
}

function rowToGrowth(row) {
  return {
    id: generateId(),
    date: getCol(row, 'date', '日期'),
    weight: toNum(getCol(row, 'weight_kg', 'weight', '體重')),
    height: toNum(getCol(row, 'height_cm', 'height', '身高')),
    headCirc: toNum(getCol(row, 'head_cm', 'head', 'headcirc', '頭圍', 'head_circumference')),
    notes: getCol(row, 'notes', '備註', 'note'),
  }
}

const CONVERTERS = { feeding: rowToFeeding, sleep: rowToSleep, diaper: rowToDiaper, growth: rowToGrowth }

// ─── Template Download ──────────────────────────────────────

function downloadTemplate(type) {
  const { sample, label } = RECORD_TYPES[type]
  const content = sample.map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `baby-diary-${label}-template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Preview Label ──────────────────────────────────────────

function previewLabel(type, record) {
  if (type === 'feeding') return `${record.time}  ${record.feedType}${record.amount ? '  ' + record.amount + 'ml' : ''}${record.duration ? '  ' + record.duration + '分' : ''}`
  if (type === 'sleep') return `${record.start} → ${record.end || '?'}`
  if (type === 'diaper') return `${record.time}  ${record.diaperType}`
  if (type === 'growth') return [record.weight && record.weight + 'kg', record.height && record.height + 'cm', record.headCirc && '頭' + record.headCirc + 'cm'].filter(Boolean).join('  ')
  return ''
}

// ─── Main Component ─────────────────────────────────────────

export default function Import() {
  const navigate = useNavigate()
  const { activeBabyId } = useApp()
  const fileRef = useRef()

  const [selectedType, setSelectedType] = useState('feeding')
  const [preview, setPreview] = useState(null) // { valid, errors }
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { rows } = parseCSV(ev.target.result)
      if (!rows.length) { toast.error('CSV 檔案無資料'); return }

      const convert = CONVERTERS[selectedType]
      const valid = []
      const errors = []

      rows.forEach((row, idx) => {
        const date = getCol(row, 'date', '日期')
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          errors.push(`第 ${idx + 2} 行：日期格式錯誤（${date || '空白'}，需為 YYYY-MM-DD）`)
          return
        }
        const record = convert(row)
        // Validate record has something useful
        if (selectedType === 'feeding' && !record.time) {
          errors.push(`第 ${idx + 2} 行：缺少 time 欄位`); return
        }
        if (selectedType === 'sleep' && !record.start) {
          errors.push(`第${idx + 2} 行：缺少 start 欄位`); return
        }
        if (selectedType === 'diaper' && !record.time) {
          errors.push(`第 ${idx + 2} 行：缺少 time 欄位`); return
        }
        if (selectedType === 'growth' && !record.weight && !record.height && !record.headCirc) {
          errors.push(`第 ${idx + 2} 行：至少填入體重、身高或頭圍其中一項`); return
        }
        valid.push({ date, record })
      })

      setPreview({ valid, errors })
      setDone(null)
      e.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!activeBabyId) { toast.error('請先在設定頁選擇寶寶'); return }
    if (!preview?.valid?.length) return
    setImporting(true)

    try {
      if (selectedType === 'growth') {
        // Growth stored in separate file — save one by one
        for (const { record } of preview.valid) {
          if (githubService.isConfigured) {
            await githubService.addGrowthRecord(activeBabyId, record)
          } else {
            const key = `growth_${activeBabyId}`
            const existing = ls.get(key) || []
            const filtered = existing.filter(r => r.id !== record.id)
            const updated = [...filtered, record].sort((a, b) => a.date.localeCompare(b.date))
            ls.set(key, updated)
          }
        }
      } else {
        // Group records by date
        const byDate = {}
        for (const { date, record } of preview.valid) {
          if (!byDate[date]) byDate[date] = []
          byDate[date].push(record)
        }

        // Load + merge + save each day
        for (const [date, records] of Object.entries(byDate)) {
          let dayRecord
          if (githubService.isConfigured) {
            dayRecord = await githubService.getDayRecord(activeBabyId, date)
          } else {
            const key = `day_${activeBabyId}_${date}`
            dayRecord = ls.get(key) || createEmptyDay(date, activeBabyId)
          }

          const existing = dayRecord[selectedType] || []
          // Avoid duplicate IDs
          const existingIds = new Set(existing.map(r => r.id))
          const newRecords = records.filter(r => !existingIds.has(r.id))
          dayRecord[selectedType] = [...existing, ...newRecords]
            .sort((a, b) => (a.time || a.start || '').localeCompare(b.time || b.start || ''))

          if (githubService.isConfigured) {
            await githubService.saveDayRecordNow(activeBabyId, date, dayRecord)
          } else {
            ls.set(`day_${activeBabyId}_${date}`, dayRecord)
          }
        }
      }

      setDone(preview.valid.length)
      setPreview(null)
      toast.success(`成功匯入 ${preview.valid.length} 筆記錄！`)
    } catch (e) {
      console.error(e)
      toast.error('匯入失敗：' + e.message)
    } finally {
      setImporting(false)
    }
  }

  const cfg = RECORD_TYPES[selectedType]

  return (
    <div className="px-4 pt-4 pb-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 touch-manipulation">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-800">CSV 資料匯入</h1>
          <p className="text-xs text-gray-400">目前支援：寶寶成長日記</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">選擇記錄類型</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(RECORD_TYPES).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { setSelectedType(key); setPreview(null); setDone(null) }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left touch-manipulation ${
                selectedType === key ? 'border-pink-300 bg-pink-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-sm font-medium text-gray-700">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Format guide + template download */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">CSV 格式範本</h2>
          <button
            onClick={() => downloadTemplate(selectedType)}
            className="flex items-center gap-1 text-xs text-blue-500 font-medium px-2.5 py-1.5 bg-blue-50 rounded-xl touch-manipulation"
          >
            <Download size={13} /> 下載範本
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 overflow-x-auto">
          <pre className="text-xs text-gray-600 font-mono whitespace-pre">
            {cfg.sample.map(row => row.join(',')).join('\n')}
          </pre>
        </div>
        <p className="text-xs text-gray-400 mt-2">{cfg.hint}</p>
      </div>

      {/* Upload area */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">上傳 CSV 檔案</h2>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 hover:bg-pink-50 transition-colors touch-manipulation"
        >
          <Upload size={28} />
          <span className="text-sm font-medium">點擊選擇 CSV 檔案</span>
          <span className="text-xs text-gray-400">支援 UTF-8 / BOM 編碼，逗號或 Tab 分隔</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values" className="hidden" onChange={handleFile} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">資料預覽</h2>
            <span className="text-xs text-gray-400">{preview.valid.length} 筆有效</span>
          </div>

          {preview.errors.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 rounded-xl">
              <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                <AlertCircle size={13} /> {preview.errors.length} 筆格式錯誤（將略過）
              </p>
              {preview.errors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-xs text-red-500">{err}</p>
              ))}
              {preview.errors.length > 3 && (
                <p className="text-xs text-red-400">…還有 {preview.errors.length - 3} 個錯誤</p>
              )}
            </div>
          )}

          {preview.valid.length > 0 ? (
            <>
              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                {preview.valid.slice(0, 8).map(({ date, record }, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400 w-24 flex-shrink-0 font-mono">{date}</span>
                    <span className="text-gray-600 truncate font-mono">{previewLabel(selectedType, record)}</span>
                  </div>
                ))}
                {preview.valid.length > 8 && (
                  <p className="text-xs text-center text-gray-400 py-1">…還有 {preview.valid.length - 8} 筆記錄</p>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> 匯入中...</>
                ) : (
                  `匯入全部 ${preview.valid.length} 筆記錄`
                )}
              </button>
            </>
          ) : (
            <p className="text-sm text-center text-gray-400 py-4">沒有可匯入的有效記錄</p>
          )}
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="card bg-green-50 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700">匯入完成！</p>
              <p className="text-xs text-green-600">已成功匯入 {done} 筆{cfg.label}，可回首頁查看</p>
            </div>
          </div>
        </div>
      )}

      {/* Supported apps */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">支援的 App</h2>
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
          <span className="text-2xl">👶</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">寶寶成長日記</p>
            <p className="text-xs text-gray-500 mt-0.5">iOS / Android</p>
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg">✓ 支援</span>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          其他 App 的匯出格式尚未支援。如需匯入，請先將 CSV 欄位手動對應至下方範本格式後再上傳。
        </p>
      </div>

      {/* How to export from 寶寶成長日記 */}
      <div className="p-3 bg-blue-50 rounded-xl">
        <p className="text-xs text-blue-700 font-medium mb-2">📤 如何從寶寶成長日記匯出</p>
        <ol className="text-xs text-blue-600 space-y-1 list-none">
          <li>1. 開啟寶寶成長日記 App</li>
          <li>2. 進入「設定」→「報表」→「匯出 CSV」</li>
          <li>3. 選擇日期範圍後儲存或分享 CSV 檔案</li>
          <li>4. 回到此頁，選擇對應的記錄類型後上傳</li>
        </ol>
        <p className="text-xs text-blue-500 mt-2">※ 匯入時不會覆蓋既有記錄，僅追加合併</p>
      </div>
    </div>
  )
}
