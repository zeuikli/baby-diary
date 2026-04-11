import React, { useState } from 'react'
import Modal from '../Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

const feedTypes = [
  { value: 'breast', label: '親餵', icon: '🤱' },
  { value: 'bottle', label: '瓶餵', icon: '🍼' },
  { value: 'pumped', label: '母乳瓶餵', icon: '🥛' },
]

const sideOptions = [
  { value: 'left', label: '左側' },
  { value: 'right', label: '右側' },
  { value: 'both', label: '雙側' },
]

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function QuickFeedingModal({ onClose, editRecord }) {
  const { addRecord, updateRecord } = useApp()
  const [form, setForm] = useState({
    time: editRecord?.time || getCurrentTime(),
    feedType: editRecord?.feedType || 'bottle',
    amount: editRecord?.amount || '',
    side: editRecord?.side || '',
    duration: editRecord?.duration || '',
    notes: editRecord?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const record = {
        ...form,
        amount: form.amount ? Number(form.amount) : null,
        duration: form.duration ? Number(form.duration) : null,
      }
      if (editRecord) {
        await updateRecord('feeding', { ...editRecord, ...record })
        toast.success('已更新')
      } else {
        await addRecord('feeding', record)
        toast.success('喝奶記錄已新增 🍼')
      }
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title="喝奶記錄" onClose={onClose}>
      <div className="space-y-4">
        {/* Feed type */}
        <div>
          <label className="form-label">餵食方式</label>
          <div className="grid grid-cols-3 gap-2">
            {feedTypes.map(t => (
              <button
                key={t.value}
                onClick={() => set('feedType', t.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-sm font-medium transition-all touch-manipulation ${
                  form.feedType === t.value
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="form-label">時間</label>
          <input
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
            className="form-input"
          />
        </div>

        {/* Amount / Duration */}
        <div className="grid grid-cols-2 gap-3">
          {form.feedType !== 'breast' && (
            <div>
              <label className="form-label">奶量 (ml)</label>
              <input
                type="number"
                placeholder="120"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="form-input"
                inputMode="numeric"
                min="0"
                max="500"
              />
            </div>
          )}
          <div>
            <label className="form-label">時間長 (分鐘)</label>
            <input
              type="number"
              placeholder="10"
              value={form.duration}
              onChange={e => set('duration', e.target.value)}
              className="form-input"
              inputMode="numeric"
              min="0"
              max="60"
            />
          </div>
        </div>

        {/* Side (for breast) */}
        {form.feedType === 'breast' && (
          <div>
            <label className="form-label">哺乳側邊</label>
            <div className="flex gap-2">
              {sideOptions.map(s => (
                <button
                  key={s.value}
                  onClick={() => set('side', form.side === s.value ? '' : s.value)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all touch-manipulation ${
                    form.side === s.value
                      ? 'bg-pink-50 border-pink-300 text-pink-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="form-label">備註</label>
          <textarea
            placeholder="可選填..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="form-input resize-none"
            rows={2}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : null}
          {editRecord ? '更新記錄' : '儲存記錄'}
        </button>
      </div>
    </Modal>
  )
}
