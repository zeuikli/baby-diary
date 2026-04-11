import React, { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import QuickSleepModal from '../components/modals/QuickSleepModal'
import EmptyState from '../components/EmptyState'

function calcDurationMins(start, end) {
  if (!start || !end) return 0
  const s = new Date(`2000-01-01T${start}`)
  const e = new Date(`2000-01-01T${end}`)
  let diff = (e - s) / 60000
  if (diff < 0) diff += 24 * 60
  return diff
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60)
  const m = Math.floor(mins % 60)
  return h > 0 ? `${h}小時${m}分鐘` : `${m}分鐘`
}

export default function Sleep() {
  const { today, deleteRecord, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const records = today?.sleep || []
  const activeSleep = records.find(r => !r.end)
  const completedSleeps = records.filter(r => r.end)
  const totalMins = completedSleeps.reduce((s, r) => s + calcDurationMins(r.start, r.end), 0)

  const handleDelete = (id) => {
    if (confirm('確定刪除此記錄？')) {
      deleteRecord('sleep', id)
    }
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Active sleep */}
      {activeSleep && (
        <div className="card bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">😴</span>
            <div className="flex-1">
              <p className="font-medium text-purple-700">睡眠進行中</p>
              <p className="text-sm text-purple-500">開始：{activeSleep.start}</p>
            </div>
            <button
              onClick={() => { setEditRecord(activeSleep); setShowModal(true) }}
              className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium active:bg-purple-600 touch-manipulation"
            >
              結束
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {completedSleeps.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日統計</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-500">{formatDuration(totalMins)}</div>
              <div className="text-xs text-gray-400">總睡眠時長</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-500">{completedSleeps.length}次</div>
              <div className="text-xs text-gray-400">睡眠次數</div>
            </div>
          </div>
        </div>
      )}

      {/* Sleep bar */}
      {completedSleeps.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">24小時睡眠分佈</h2>
          <SleepBar records={records} />
        </div>
      )}

      {/* Records */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">記錄列表</h2>
          <button
            onClick={() => { setEditRecord(null); setShowModal(true) }}
            className="flex items-center gap-1 text-xs text-pink-500 font-medium px-2 py-1 bg-pink-50 rounded-lg touch-manipulation"
          >
            <Plus size={14} /> 新增
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon="😴"
            title="還沒有睡眠記錄"
            subtitle="點擊新增按鈕，或使用首頁快速記錄"
            action={{ label: '新增記錄', onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...records].reverse().map((record, idx) => {
              const duration = record.end ? calcDurationMins(record.start, record.end) : null
              return (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{record.end ? '😴' : '💤'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{record.start}</span>
                      {record.end && <span className="text-gray-400 text-xs">→ {record.end}</span>}
                      {!record.end && <span className="tag bg-purple-100 text-purple-600 animate-pulse-soft">進行中</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {duration ? formatDuration(duration) : '計時中...'}
                      {record.notes ? ` · ${record.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditRecord(record); setShowModal(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 touch-manipulation">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 touch-manipulation">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => { setEditRecord(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-purple-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <QuickSleepModal
          activeSleep={activeSleep && editRecord?.id === activeSleep.id ? activeSleep : null}
          editRecord={editRecord && editRecord.end ? editRecord : null}
          onClose={() => { setShowModal(false); setEditRecord(null) }}
        />
      )}
    </div>
  )
}

function SleepBar({ records }) {
  const segments = records.map(r => {
    const startH = parseInt(r.start.split(':')[0])
    const startM = parseInt(r.start.split(':')[1])
    const endH = r.end ? parseInt(r.end.split(':')[0]) : new Date().getHours()
    const endM = r.end ? parseInt(r.end.split(':')[1]) : new Date().getMinutes()
    const startPct = ((startH * 60 + startM) / (24 * 60)) * 100
    const endPct = ((endH * 60 + endM) / (24 * 60)) * 100
    return { startPct, width: Math.max(endPct - startPct, 0.5), isActive: !r.end }
  })

  const hours = [0, 6, 12, 18, 24]

  return (
    <div>
      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`absolute h-full rounded-full ${seg.isActive ? 'bg-purple-300 animate-pulse-soft' : 'bg-purple-400'}`}
            style={{ left: `${seg.startPct}%`, width: `${seg.width}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {hours.map(h => (
          <span key={h} className="text-[10px] text-gray-400">{h === 24 ? '24' : `${h}時`}</span>
        ))}
      </div>
    </div>
  )
}
