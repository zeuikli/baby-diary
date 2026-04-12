import React, { useState, useRef } from 'react'
import { Upload, Download, Check, AlertCircle, ArrowLeft, Zap, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { githubService, generateId, createEmptyDay } from '../services/github'
import { ls } from '../services/localStorage'
import toast from 'react-hot-toast'

// ─── CSV Line Parser ─────────────────────────────────────────

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

function normalizeText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

// ─── 寶寶成長日記 One-click Parser ──────────────────────────────

const BD_DIAPER_MAP  = { 尿尿: 'wet', 大便: 'dirty', 混合: 'mixed', 乾淨: 'dry' }

function parseBabyDiaryExport(text) {
  const lines = normalizeText(text).split('\n')
  // Must start with "Baby Diary 報表"
  if (!lines[0].includes('Baby Diary 報表')) return null

  const feeding = []
  const diaper  = []
  const growth  = []
  let section = null

  for (const line of lines) {
    const t = line.trim()
    if (!t) { section = null; continue }

    if (t === '瓶餵')    { section = 'bottle'; continue }
    if (t === '親餵')    { section = 'breast'; continue }
    if (t === '尿布')    { section = 'diaper'; continue }
    if (t === '成長紀錄') { section = 'growth'; continue }
    if (!section) continue

    const cols = t.split(',').map(s => s.trim())

    if (section === 'bottle') {
      if (cols[0] === '時間') continue
      const dt = bdParseDateTime(cols[0]); if (!dt) continue
      feeding.push({ date: dt.date, record: {
        id: generateId(), time: dt.time,
        feedType: cols[1] === '母乳' ? 'pumped' : 'bottle',
        amount: parseFloat(cols[2]) || null, duration: null, side: null, notes: '',
      }})
    }

    if (section === 'breast') {
      if (cols[0] === '時間') continue
      const dt = bdParseDateTime(cols[0]); if (!dt) continue
      const left = parseInt(cols[1]) || 0
      const right = parseInt(cols[2]) || 0
      feeding.push({ date: dt.date, record: {
        id: generateId(), time: dt.time, feedType: 'breast', amount: null,
        duration: (left + right) || null,
        side: (left > 0 && right > 0) ? 'both' : (left > 0 ? 'left' : 'right'),
        notes: '',
      }})
    }

    if (section === 'diaper') {
      if (cols[0] === '時間') continue
      const dt = bdParseDateTime(cols[0]); if (!dt) continue
      diaper.push({ date: dt.date, record: {
        id: generateId(), time: dt.time,
        diaperType: BD_DIAPER_MAP[cols[1]] || 'wet', notes: '',
      }})
    }

    if (section === 'growth') {
      if (cols[0] === '日期') continue
      const date = bdParseDate(cols[0]); if (!date) continue
      const height = parseFloat(cols[1]) || 0
      const weight = parseFloat(cols[2]) || 0
      const head   = parseFloat(cols[3]) || 0
      if (!height && !weight && !head) continue
      growth.push({ date, record: {
        id: generateId(), date,
        weight: weight > 0 ? weight : null,
        height: height > 0 ? height : null,
        headCirc: head > 0 ? head : null,
        notes: '',
      }})
    }
  }

  return { feeding, diaper, growth }
}

function bdParseDateTime(str) {
  const m = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/)
  if (!m) return null
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
}

function bdParseDate(str) {
  const m = str.match(/^(\d{4})\/(\d{2})\/(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

// ─── Manual CSV Parser ────────────────────────────────────────

function parseCSV(text) {
  const lines = normalizeText(text).split('\n').filter(l => l.trim())
  if (lines.length < 2) return { rows: [] }
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim() })
    return row
  }).filter(row => Object.values(row).some(v => v))
  return { rows }
}

// ─── Record Type Configs ──────────────────────────────────────

const RECORD_TYPES = {
  feeding: {
    label: '喝奶記錄', icon: '🍼',
    sample: [
      ['日期','時間','類型','奶量(ml)','時長(分鐘)','側邊','備註'],
      ['2026-04-11','08:30','親餵','','15','左側',''],
      ['2026-04-11','11:00','瓶餵','120','','',''],
      ['2026-04-11','14:30','母乳瓶餵','80','20','雙側',''],
    ],
    hint: '類型：親餵 / 瓶餵 / 母乳瓶餵　側邊：左側 / 右側 / 雙側',
  },
  sleep: {
    label: '睡眠記錄', icon: '😴',
    sample: [
      ['日期','開始','結束','備註'],
      ['2026-04-11','13:00','14:30','午睡'],
      ['2026-04-11','23:30','04:00','跨午夜填同一天日期'],
    ],
    hint: '跨午夜：結束時間小於開始時間時系統自動識別',
  },
  diaper: {
    label: '尿布記錄', icon: '🫧',
    sample: [
      ['日期','時間','類型','顏色','備註'],
      ['2026-04-11','09:15','尿尿','',''],
      ['2026-04-11','13:00','便便','黃色',''],
      ['2026-04-11','17:30','混合','',''],
    ],
    hint: '類型：尿尿 / 便便 / 混合 / 乾淨',
  },
  pumping: {
    label: '擠奶記錄', icon: '🤱',
    sample: [
      ['日期','時間','側邊','奶量(ml)','時長(分鐘)','備註'],
      ['2026-04-11','06:00','雙側','100','15',''],
      ['2026-04-11','12:00','左側','80','10',''],
    ],
    hint: '側邊：左側 / 右側 / 雙側',
  },
  solids: {
    label: '副食品紀錄', icon: '🥣',
    sample: [
      ['日期','時間','食物','食量(ml)','反應','備註'],
      ['2026-04-11','11:30','米糊','30','喜歡','第一次嘗試'],
      ['2026-04-11','17:00','蔬菜泥、水果泥','50','接受',''],
    ],
    hint: '食量可選填　反應：喜歡 / 接受 / 拒絕 / 過敏',
  },
  growth: {
    label: '成長記錄', icon: '📏',
    sample: [
      ['日期','體重(kg)','身高(cm)','頭圍(cm)','備註'],
      ['2026-04-01','3.3','50.5','34.0','出生'],
      ['2026-05-01','5.2','57.0','38.0','一個月健診'],
    ],
    hint: '體重 / 身高 / 頭圍至少填一項',
  },
}

// ─── Row Converters ────────────────────────────────────────────

function getCol(row, ...keys) {
  for (const k of keys) { if (row[k] !== undefined && row[k] !== '') return row[k] }
  return ''
}
function toNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n }

const FEED_TYPE_MAP   = { breast:'breast', 親餵:'breast', breastfeed:'breast', bottle:'bottle', 瓶餵:'bottle', formula:'bottle', pumped:'pumped', 母乳:'pumped', 母乳瓶餵:'pumped' }
const SIDE_MAP        = { left:'left', 左:'left', 左側:'left', right:'right', 右:'right', 右側:'right', both:'both', 雙:'both', 雙側:'both' }
const DIAPER_TYPE_MAP = { wet:'wet', 尿尿:'wet', urine:'wet', dirty:'dirty', 便便:'dirty', poop:'dirty', bm:'dirty', mixed:'mixed', 混合:'mixed', dry:'dry', 乾淨:'dry', clean:'dry' }

function rowToFeeding(row) {
  return { id: generateId(), time: getCol(row,'time','時間','start_time'), feedType: FEED_TYPE_MAP[(getCol(row,'type','類型','feed_type')||'').toLowerCase()]||'bottle', amount: toNum(getCol(row,'amount_ml','amount','奶量','奶量(ml)')), duration: toNum(getCol(row,'duration_min','duration','時長','時長(分鐘)')), side: SIDE_MAP[(getCol(row,'side','側邊')||'').toLowerCase()]||null, notes: getCol(row,'notes','備註') }
}
function rowToSleep(row) {
  return { id: generateId(), start: getCol(row,'start','開始','start_time'), end: getCol(row,'end','結束','end_time'), notes: getCol(row,'notes','備註') }
}
function rowToDiaper(row) {
  return { id: generateId(), time: getCol(row,'time','時間'), diaperType: DIAPER_TYPE_MAP[(getCol(row,'type','類型','diaper_type')||'wet').toLowerCase()]||'wet', color: getCol(row,'color','顏色')||'', notes: getCol(row,'notes','備註') }
}
function rowToPumping(row) {
  return { id: generateId(), time: getCol(row,'time','時間'), side: SIDE_MAP[(getCol(row,'side','側邊')||'both').toLowerCase()]||'both', amount: toNum(getCol(row,'amount_ml','amount','奶量','奶量(ml)')), duration: toNum(getCol(row,'duration_min','duration','時長','時長(分鐘)')), notes: getCol(row,'notes','備註') }
}
function rowToSolids(row) {
  return { id: generateId(), time: getCol(row,'time','時間'), food: getCol(row,'food','食物'), amount: toNum(getCol(row,'amount_ml','amount','食量','食量(ml)')), reaction: getCol(row,'reaction','反應'), notes: getCol(row,'notes','備註') }
}
function rowToGrowth(row) {
  return { id: generateId(), date: getCol(row,'date','日期'), weight: toNum(getCol(row,'weight_kg','weight','體重','體重(kg)')), height: toNum(getCol(row,'height_cm','height','身高','身高(cm)')), headCirc: toNum(getCol(row,'head_cm','head','頭圍','頭圍(cm)','head_circumference')), notes: getCol(row,'notes','備註') }
}
const CONVERTERS = { feeding: rowToFeeding, sleep: rowToSleep, diaper: rowToDiaper, pumping: rowToPumping, solids: rowToSolids, growth: rowToGrowth }

const FEED_TYPE_ZH = { breast:'親餵', bottle:'瓶餵', pumped:'母乳瓶餵' }
const SIDE_ZH = { left:'左側', right:'右側', both:'雙側' }
const DIAPER_TYPE_ZH = { wet:'尿尿', dirty:'便便', mixed:'混合', dry:'乾淨' }

function previewLabel(type, record) {
  if (type === 'feeding') return `${record.time}  ${FEED_TYPE_ZH[record.feedType]||record.feedType}${record.amount ? '  '+record.amount+'ml' : ''}${record.duration ? '  '+record.duration+'分' : ''}`
  if (type === 'sleep')   return `${record.start} → ${record.end || '?'}`
  if (type === 'diaper')  return `${record.time}  ${DIAPER_TYPE_ZH[record.diaperType]||record.diaperType}`
  if (type === 'pumping') return `${record.time}  ${SIDE_ZH[record.side]||record.side}${record.amount ? '  '+record.amount+'ml' : ''}`
  if (type === 'solids')  return `${record.time}  ${record.food}${record.reaction ? '  '+record.reaction : ''}`
  if (type === 'growth')  return [record.weight&&record.weight+'kg', record.height&&record.height+'cm', record.headCirc&&'頭'+record.headCirc+'cm'].filter(Boolean).join('  ')
  return ''
}

function downloadTemplate(type) {
  const { sample, label } = RECORD_TYPES[type]
  const blob = new Blob(['\uFEFF' + sample.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `baby-diary-${label}-template.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Shared Import Logic ──────────────────────────────────────

async function mergeAndSave(activeBabyId, date, type, records) {
  let dayRecord
  if (githubService.isConfigured) {
    dayRecord = await githubService.getDayRecord(activeBabyId, date)
  } else {
    dayRecord = ls.get(`day_${activeBabyId}_${date}`) || createEmptyDay(date, activeBabyId)
  }
  const existing = dayRecord[type] || []
  const existingIds = new Set(existing.map(r => r.id))
  dayRecord[type] = [...existing, ...records.filter(r => !existingIds.has(r.id))]
    .sort((a, b) => (a.time || a.start || '').localeCompare(b.time || b.start || ''))
  if (githubService.isConfigured) {
    await githubService.saveDayRecordNow(activeBabyId, date, dayRecord)
  } else {
    ls.set(`day_${activeBabyId}_${date}`, dayRecord)
  }
}

async function saveGrowthRecord(activeBabyId, record) {
  if (githubService.isConfigured) {
    await githubService.addGrowthRecord(activeBabyId, record)
  } else {
    const key = `growth_${activeBabyId}`
    const existing = ls.get(key) || []
    ls.set(key, [...existing.filter(r => r.id !== record.id), record].sort((a,b) => a.date.localeCompare(b.date)))
  }
}

// ─── Main Component ───────────────────────────────────────────

export default function Import() {
  const navigate = useNavigate()
  const { activeBabyId } = useApp()

  const [tab, setTab] = useState('quick') // 'quick' | 'manual'

  // Quick import state
  const quickRef = useRef()
  const [quickPreview, setQuickPreview] = useState(null)  // { feeding, diaper, growth }
  const [quickImporting, setQuickImporting] = useState(false)
  const [quickDone, setQuickDone] = useState(null)
  const [quickProgress, setQuickProgress] = useState(null) // { current, total, label }

  // Manual import state
  const manualRef = useRef()
  const [selectedType, setSelectedType] = useState('feeding')
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const [manualProgress, setManualProgress] = useState(null) // { current, total, label }

  // ── Quick import handlers ──────────────────────────────────

  const handleQuickFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parseBabyDiaryExport(ev.target.result)
      if (!result) { toast.error('無法識別格式，請確認是寶寶成長日記的完整匯出檔'); return }
      if (!result.feeding.length && !result.diaper.length && !result.growth.length) {
        toast.error('檔案中沒有找到可匯入的記錄'); return
      }
      setQuickPreview(result)
      setQuickDone(null)
      e.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleQuickImport = async () => {
    if (!activeBabyId) { toast.error('請先在設定頁選擇寶寶'); return }
    if (!quickPreview) return
    setQuickImporting(true)
    try {
      const { feeding, diaper, growth } = quickPreview

      // Group by date
      const feedByDate = {}
      const diaperByDate = {}
      for (const { date, record } of feeding) { (feedByDate[date] = feedByDate[date] || []).push(record) }
      for (const { date, record } of diaper)  { (diaperByDate[date] = diaperByDate[date] || []).push(record) }

      // Merge all unique dates — feeding + diaper in ONE read+write per day
      const allDates = [...new Set([...Object.keys(feedByDate), ...Object.keys(diaperByDate)])].sort()
      const totalSteps = allDates.length + growth.length
      let step = 0

      for (const date of allDates) {
        setQuickProgress({ current: step, total: totalSteps, label: date })

        let dayRecord
        if (githubService.isConfigured) {
          dayRecord = await githubService.getDayRecord(activeBabyId, date)
        } else {
          dayRecord = ls.get(`day_${activeBabyId}_${date}`) || createEmptyDay(date, activeBabyId)
        }

        if (feedByDate[date]) {
          const existing = dayRecord.feeding || []
          const existingIds = new Set(existing.map(r => r.id))
          dayRecord.feeding = [...existing, ...feedByDate[date].filter(r => !existingIds.has(r.id))]
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        }
        if (diaperByDate[date]) {
          const existing = dayRecord.diaper || []
          const existingIds = new Set(existing.map(r => r.id))
          dayRecord.diaper = [...existing, ...diaperByDate[date].filter(r => !existingIds.has(r.id))]
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        }

        if (githubService.isConfigured) {
          await githubService.saveDayRecordNow(activeBabyId, date, dayRecord)
        } else {
          ls.set(`day_${activeBabyId}_${date}`, dayRecord)
        }
        step++
      }

      // Growth records
      for (const { record } of growth) {
        setQuickProgress({ current: step, total: totalSteps, label: `成長 ${record.date}` })
        await saveGrowthRecord(activeBabyId, record)
        step++
      }

      setQuickProgress({ current: totalSteps, total: totalSteps, label: '完成' })
      const total = feeding.length + diaper.length + growth.length
      setQuickDone({ feeding: feeding.length, diaper: diaper.length, growth: growth.length, total })
      setQuickPreview(null)
      toast.success(`成功匯入 ${total} 筆記錄！`)
    } catch (err) {
      console.error(err)
      toast.error('匯入失敗：' + err.message)
    } finally {
      setQuickImporting(false)
      setQuickProgress(null)
    }
  }

  // ── Manual import handlers ─────────────────────────────────

  const handleManualFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { rows } = parseCSV(ev.target.result)
      if (!rows.length) { toast.error('CSV 檔案無資料'); return }
      const convert = CONVERTERS[selectedType]
      const valid = []; const errors = []
      rows.forEach((row, idx) => {
        const date = getCol(row, 'date', '日期')
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) { errors.push(`第 ${idx+2} 行：日期格式錯誤（${date||'空白'}）`); return }
        const record = convert(row)
        if (selectedType==='feeding' && !record.time) { errors.push(`第 ${idx+2} 行：缺少時間`); return }
        if (selectedType==='sleep'   && !record.start) { errors.push(`第 ${idx+2} 行：缺少開始時間`); return }
        if (selectedType==='diaper'  && !record.time) { errors.push(`第 ${idx+2} 行：缺少時間`); return }
        if (selectedType==='pumping' && !record.time) { errors.push(`第 ${idx+2} 行：缺少時間`); return }
        if (selectedType==='solids'  && !record.time) { errors.push(`第 ${idx+2} 行：缺少時間`); return }
        if (selectedType==='solids'  && !record.food) { errors.push(`第 ${idx+2} 行：缺少食物`); return }
        if (selectedType==='growth'  && !record.weight && !record.height && !record.headCirc) { errors.push(`第 ${idx+2} 行：無有效量測值`); return }
        valid.push({ date, record })
      })
      setPreview({ valid, errors }); setDone(null); e.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!activeBabyId) { toast.error('請先選擇寶寶'); return }
    if (!preview?.valid?.length) return
    setImporting(true)
    try {
      if (selectedType === 'growth') {
        const total = preview.valid.length
        for (let i = 0; i < total; i++) {
          setManualProgress({ current: i, total, label: preview.valid[i].date })
          await saveGrowthRecord(activeBabyId, preview.valid[i].record)
        }
      } else {
        const byDate = {}
        for (const { date, record } of preview.valid) { (byDate[date] = byDate[date] || []).push(record) }
        const dates = Object.keys(byDate).sort()
        for (let i = 0; i < dates.length; i++) {
          setManualProgress({ current: i, total: dates.length, label: dates[i] })
          await mergeAndSave(activeBabyId, dates[i], selectedType, byDate[dates[i]])
        }
      }
      setDone(preview.valid.length); setPreview(null)
      toast.success(`成功匯入 ${preview.valid.length} 筆記錄！`)
    } catch (err) {
      console.error(err); toast.error('匯入失敗：' + err.message)
    } finally {
      setImporting(false)
      setManualProgress(null)
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
          <h1 className="text-base font-semibold text-gray-800">資料匯入</h1>
          <p className="text-xs text-gray-400">目前支援：寶寶成長日記</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => { setTab('quick'); setQuickPreview(null); setQuickDone(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all touch-manipulation ${tab==='quick' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
        >
          <Zap size={13} /> 一鍵匯入（寶寶成長日記）
        </button>
        <button
          onClick={() => { setTab('manual'); setPreview(null); setDone(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all touch-manipulation ${tab==='manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
        >
          <FileText size={13} /> 分類匯入
        </button>
      </div>

      {/* ── Quick Import Tab ────────────────────────────────── */}
      {tab === 'quick' && (
        <>
          {/* How to export */}
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 font-medium mb-2">📤 如何從寶寶成長日記匯出完整報表</p>
            <ol className="text-xs text-blue-600 space-y-1">
              <li>1. 開啟寶寶成長日記 App</li>
              <li>2. 進入「設定」→「報表」→「匯出 CSV」</li>
              <li>3. 選擇日期範圍，點擊匯出並儲存檔案</li>
              <li>4. 回到此頁上傳，系統自動解析所有類型</li>
            </ol>
            <p className="text-xs text-blue-500 mt-2">※ 喝奶、尿布、成長三類資料一次全部匯入</p>
          </div>

          {/* Upload */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">上傳寶寶成長日記匯出檔</h2>
            <button
              onClick={() => quickRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 hover:bg-pink-50 transition-colors touch-manipulation"
            >
              <Upload size={28} />
              <span className="text-sm font-medium">點擊上傳 CSV 檔案</span>
              <span className="text-xs text-gray-400">寶寶成長日記原始匯出，無需修改格式</span>
            </button>
            <input ref={quickRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleQuickFile} />
          </div>

          {/* Preview */}
          {quickPreview && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">解析結果</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon:'🍼', label:'喝奶', count: quickPreview.feeding.length },
                  { icon:'🫧', label:'尿布', count: quickPreview.diaper.length },
                  { icon:'📏', label:'成長', count: quickPreview.growth.length },
                ].map(({ icon, label, count }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xl">{icon}</div>
                    <div className="text-sm font-bold text-gray-800 mt-1">{count} 筆</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
              </div>
              {quickImporting && quickProgress && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>處理中：{quickProgress.label}</span>
                    <span>{quickProgress.current} / {quickProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-pink-400 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((quickProgress.current / quickProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    {Math.round((quickProgress.current / quickProgress.total) * 100)}%　資料量大時可能需要數分鐘，請勿關閉頁面
                  </p>
                </div>
              )}
              <button
                onClick={handleQuickImport}
                disabled={quickImporting}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {quickImporting
                  ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> 匯入中...</>
                  : `一鍵匯入全部 ${quickPreview.feeding.length + quickPreview.diaper.length + quickPreview.growth.length} 筆記錄`
                }
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">匯入時不會覆蓋既有記錄，僅追加合併</p>
            </div>
          )}

          {/* Done */}
          {quickDone && (
            <div className="card bg-green-50 border border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">匯入完成！共 {quickDone.total} 筆</p>
                  <p className="text-xs text-green-600">可至首頁或各記錄頁面查看</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-green-100 rounded-lg p-2"><span className="text-base">🍼</span><br />{quickDone.feeding} 筆喝奶</div>
                <div className="bg-green-100 rounded-lg p-2"><span className="text-base">🫧</span><br />{quickDone.diaper} 筆尿布</div>
                <div className="bg-green-100 rounded-lg p-2"><span className="text-base">📏</span><br />{quickDone.growth} 筆成長</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Manual Import Tab ──────────────────────────────── */}
      {tab === 'manual' && (
        <>
          {/* Type selector */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">選擇記錄類型</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RECORD_TYPES).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedType(key); setPreview(null); setDone(null) }}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left touch-manipulation ${selectedType===key ? 'border-pink-300 bg-pink-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format guide */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">CSV 格式範本</h2>
              <button onClick={() => downloadTemplate(selectedType)} className="flex items-center gap-1 text-xs text-blue-500 font-medium px-2.5 py-1.5 bg-blue-50 rounded-xl touch-manipulation">
                <Download size={13} /> 下載範本
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 overflow-x-auto">
              <pre className="text-xs text-gray-600 font-mono whitespace-pre">{cfg.sample.map(r => r.join(',')).join('\n')}</pre>
            </div>
            <p className="text-xs text-gray-400 mt-2">{cfg.hint}</p>
          </div>

          {/* Upload */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">上傳 CSV 檔案</h2>
            <button
              onClick={() => manualRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 hover:bg-pink-50 transition-colors touch-manipulation"
            >
              <Upload size={28} />
              <span className="text-sm font-medium">點擊選擇 CSV 檔案</span>
              <span className="text-xs text-gray-400">支援 UTF-8 / BOM 編碼，逗號或 Tab 分隔</span>
            </button>
            <input ref={manualRef} type="file" accept=".csv,text/csv,.tsv" className="hidden" onChange={handleManualFile} />
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
                  <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1"><AlertCircle size={13} /> {preview.errors.length} 筆錯誤將略過</p>
                  {preview.errors.slice(0,3).map((e,i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                  {preview.errors.length > 3 && <p className="text-xs text-red-400">…還有 {preview.errors.length-3} 個錯誤</p>}
                </div>
              )}
              {preview.valid.length > 0 ? (
                <>
                  <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                    {preview.valid.slice(0,8).map(({ date, record }, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-400 w-24 flex-shrink-0 font-mono">{date}</span>
                        <span className="text-gray-600 truncate font-mono">{previewLabel(selectedType, record)}</span>
                      </div>
                    ))}
                    {preview.valid.length > 8 && <p className="text-xs text-center text-gray-400 py-1">…還有 {preview.valid.length-8} 筆</p>}
                  </div>
                  {importing && manualProgress && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>處理中：{manualProgress.label}</span>
                        <span>{manualProgress.current} / {manualProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className="bg-pink-400 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((manualProgress.current / manualProgress.total) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 text-center mt-1">
                        {Math.round((manualProgress.current / manualProgress.total) * 100)}%
                      </p>
                    </div>
                  )}
                  <button onClick={handleImport} disabled={importing} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                    {importing ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> 匯入中...</> : `匯入全部 ${preview.valid.length} 筆記錄`}
                  </button>
                </>
              ) : (
                <p className="text-sm text-center text-gray-400 py-4">沒有可匯入的有效記錄</p>
              )}
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="card bg-green-50 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">匯入完成！</p>
                  <p className="text-xs text-green-600">已成功匯入 {done} 筆{cfg.label}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
