import React, { useState, useEffect } from 'react'
import Modal from '../Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function calcDuration(start, end) {
  const s = new Date(`2000-01-01T${start}`)
  const e = new Date(`2000-01-01T${end}`)
  let diff = (e - s) / 60000
  if (diff < 0) diff += 24 * 60
  const h = Math.floor(diff / 60)
  const m = Math.floor(diff % 60)
  return h > 0 ? `${h}小時${m}分鐘` : `${m}分鐘`
}

export default function QuickSleepModal({ onClose, activeSleep, editRecord }) {
  const { addRecord, updateRecord } = useApp()
  const [mode, setMode] = useState(activeSleep ? 'end' : 'start')
  const [form, setForm] = useState({
    start: editRecord?.start || activeSleep?.start || getCurrentTime(),
    end: editRecord?.end || getCurrentTime(),
    notes: editRecord?.notes || activeSleep?.notes || '',
  })
  const [elapsed, setElapsed] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (activeSleep && mode === 'end') {
      const update = () => {
        const now = new Date()
        const start = new Date()
        const [h, m] = activeSleep.start.split(':')
        start.setHours(h, m, 0, 0)
        const diff = (now - start) / 60000
        const hrs = Math.floor(diff / 60)
        const mins = Math.floor(diff % 60)
        setElapsed(hrs > 0 ? `${hrs}小時${mins}分鐘` : `${mins}分鐘`)
      }
      update()
      const timer = setInterval(update, 30000)
      return () => clearInterval(timer)
    }
  }, [activeSleep, mode])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleStart = async () => {
    setSaving(true)
    try {
      await addRecord('sleep', { start: form.start, end: null, notes: form.notes })
      toast.success('睡眠計時開始 😴')
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleEnd = async () => {
    setSaving(true)
    try {
      if (activeSleep) {
        await updateRecord('sleep', { ...activeSleep, end: form.end, notes: form.notes })
      } else if (editRecord) {
        await updateRecord('sleep', { ...editRecord, end: form.end, notes: form.notes })
      } else {
        await addRecord('sleep', { start: form.start, end: form.end, notes: form.notes })
      }
      toast.success(`睡眠記錄完成 · ${calcDuration(activeSleep?.start || form.start, form.end)}`)
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title="睡眠記錄" onClose={onClose}>
      <div className="space-y-4">
        {/* Mode tabs */}
        {!activeSleep && !editRecord && (
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMode('start')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'start' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
            >
              開始睡覺
            </button>
            <button
              onClick={() => setMode('end')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'end' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
            >
              手動新增
            </button>
          </div>
        )}

        {/* Active sleep info */}
        {activeSleep && (
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-1">😴</div>
            <p className="text-purple-700 font-medium">目前睡眠中</p>
            <p className="text-purple-500 text-sm">開始：{activeSleep.start}</p>
            {elapsed && <p className="text-purple-600 font-semibold mt-1">{elapsed}</p>}
          </div>
        )}

        {/* Start time */}
        {(mode === 'end' || !activeSleep) && (
          <div>
            <label className="form-label">開始時間</label>
            <input
              type="time"
              value={form.start}
              onChange={e => set('start', e.target.value)}
              disabled={!!activeSleep}
              className="form-input disabled:opacity-60"
            />
          </div>
        )}

        {/* End time */}
        {(mode === 'end' || activeSleep || editRecord) && (
          <div>
            <label className="form-label">結束時間</label>
            <input
              type="time"
              value={form.end}
              onChange={e => set('end', e.target.value)}
              className="form-input"
            />
          </div>
        )}

        {/* Duration preview */}
        {(mode === 'end' || activeSleep) && form.end && (
          <div className="text-center text-sm text-purple-600 font-medium bg-purple-50 py-2 rounded-xl">
            睡眠時長：{calcDuration(activeSleep?.start || form.start, form.end)}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="form-label">備註</label>
          <textarea
            placeholder="睡眠品質、備註..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="form-input resize-none"
            rows={2}
          />
        </div>

        {/* Action button */}
        {mode === 'start' && !activeSleep && !editRecord ? (
          <button onClick={handleStart} disabled={saving} className="w-full btn-primary py-3 bg-purple-400 hover:bg-purple-500">
            {saving ? '儲存中...' : '開始計時 😴'}
          </button>
        ) : (
          <button onClick={handleEnd} disabled={saving} className="w-full btn-primary py-3 bg-purple-400 hover:bg-purple-500">
            {saving ? '儲存中...' : activeSleep ? '停止睡眠' : '儲存記錄'}
          </button>
        )}
      </div>
    </Modal>
  )
}
