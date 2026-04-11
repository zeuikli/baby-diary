#!/usr/bin/env node
/**
 * 寶寶成長日記 原始 CSV 匯出 → Baby Diary PWA 各類型 CSV 轉換腳本
 * 用法: node convert-baby-diary.cjs <匯出檔案路徑>
 * 例:   node convert-baby-diary.cjs "imports/BabyDiary_肉肉 2.csv"
 */

const fs = require('fs')
const path = require('path')

const inputFile = process.argv[2]
if (!inputFile) {
  console.error('用法: node convert-baby-diary.cjs <匯出檔案路徑>')
  process.exit(1)
}

const OUT = path.join(__dirname, 'imports')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

function parseDateTime(str) {
  const m = str.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/)
  if (!m) return null
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
}

function parseDate(str) {
  const m = str.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => {
      const v = String(r[h] ?? '')
      return v.includes(',') ? `"${v}"` : v
    }).join(','))
  }
  return '\uFEFF' + lines.join('\n') + '\n'
}

const DIAPER_MAP = { 尿尿: 'wet', 大便: 'dirty', 混合: 'mixed', 乾淨: 'dry' }

const raw = fs.readFileSync(inputFile, 'utf-8')
const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

const feedingRows = []
const diaperRows  = []
const growthRows  = []

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
    const dt = parseDateTime(cols[0])
    if (!dt) continue
    const type = cols[1] === '母乳' ? 'pumped' : 'bottle'
    feedingRows.push({ date: dt.date, time: dt.time, type, amount_ml: cols[2] || '', duration_min: '', side: '', notes: '' })
  }

  if (section === 'breast') {
    if (cols[0] === '時間') continue
    const dt = parseDateTime(cols[0])
    if (!dt) continue
    const left  = parseInt(cols[1]) || 0
    const right = parseInt(cols[2]) || 0
    const duration = left + right
    const side = (left > 0 && right > 0) ? 'both' : (left > 0 ? 'left' : 'right')
    feedingRows.push({ date: dt.date, time: dt.time, type: 'breast', amount_ml: '', duration_min: duration || '', side, notes: '' })
  }

  if (section === 'diaper') {
    if (cols[0] === '時間') continue
    const dt = parseDateTime(cols[0])
    if (!dt) continue
    diaperRows.push({ date: dt.date, time: dt.time, type: DIAPER_MAP[cols[1]] || 'wet', notes: '' })
  }

  if (section === 'growth') {
    if (cols[0] === '日期') continue
    const date = parseDate(cols[0])
    if (!date) continue
    const height = parseFloat(cols[1]) || 0
    const weight = parseFloat(cols[2]) || 0
    const head   = parseFloat(cols[3]) || 0
    if (!height && !weight && !head) continue
    growthRows.push({ date, weight_kg: weight > 0 ? weight : '', height_cm: height > 0 ? height : '', head_cm: head > 0 ? head : '', notes: '' })
  }
}

feedingRows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

fs.writeFileSync(path.join(OUT, 'feeding.csv'), toCsv(feedingRows, ['date','time','type','amount_ml','duration_min','side','notes']))
fs.writeFileSync(path.join(OUT, 'diaper.csv'),  toCsv(diaperRows,  ['date','time','type','notes']))
fs.writeFileSync(path.join(OUT, 'growth.csv'),  toCsv(growthRows,  ['date','weight_kg','height_cm','head_cm','notes']))

console.log(`✅ feeding.csv — ${feedingRows.length} 筆`)
console.log(`✅ diaper.csv  — ${diaperRows.length} 筆`)
console.log(`✅ growth.csv  — ${growthRows.length} 筆`)
console.log(`\n📁 檔案已輸出到 imports/ 資料夾`)
