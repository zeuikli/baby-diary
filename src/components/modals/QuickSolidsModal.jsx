import React, { useState } from 'react'
import Modal from '../Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

const reactionOptions = [
  { label: '喜歡', icon: '😋' },
  { label: '接受', icon: '🙂' },
  { label: '拒絕', icon: '😣' },
  { label: '過敏', icon: '⚠️' },
]

const foodSuggestions = ['米糊', '麥糊', '蔬菜泥', '水果泥', '肉泥', '粥', '蛋黃']

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function QuickSolidsModal({ onClose, editRecord }) {
  const { addRecord, updateRecord } = useApp()
  const [form, setForm] = useState({
    time: editRecord?.time || getCurrentTime(),
    food: editRecord?.food || '',
    amount: editRecord?.amount || '',
    reaction: editRecord?.reaction || '',
    notes: editRecord?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleFood = (name) => {
    const current = form.food.split('、').map(s => s.trim()).filter(Boolean)
    const idx = current.indexOf(name)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(name)
    set('food', current.join('、'))
  }

  const handleSave = async () => {
    if (!form.food.trim()) {
      toast.error('請輸入食物')
      return
    }
    setSaving(true)
    try {
      const record = { ...form, amount: form.amount ? Number(form.amount) : null }
      if (editRecord) {
        await updateRecord('solids', { ...editRecord, ...record })
        toast.success('已更新')
      } else {
        await addRecord('solids', record)
        toast.success('副食品紀錄已新增 🥣')
      }
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title="副食品記錄" onClose={onClose}>
      <div className="space-y-4">
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

        {/* Food name */}
        <div>
          <label className="form-label">食物</label>
          <input
            type="text"
            placeholder="例如：米糊、蔬菜泥"
            value={form.food}
            onChange={e => set('food', e.target.value)}
            className="form-input"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {foodSuggestions.map(name => {
              const selected = form.food.split('、').map(s => s.trim()).includes(name)
              return (
                <button
                  key={name}
                  onClick={() => toggleFood(name)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all touch-manipulation ${
                    selected
                      ? 'bg-green-50 border-green-300 text-green-600'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="form-label">食量 (ml)</label>
          <input
            type="number"
            placeholder="例如：30"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            className="form-input"
            inputMode="numeric"
            min="0"
          />
        </div>

        {/* Reaction */}
        <div>
          <label className="form-label">反應</label>
          <div className="grid grid-cols-4 gap-2">
            {reactionOptions.map(r => (
              <button
                key={r.label}
                onClick={() => set('reaction', form.reaction === r.label ? '' : r.label)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
                  form.reaction === r.label
                    ? 'bg-green-50 border-green-300 text-green-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-lg leading-none">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">備註</label>
          <textarea
            placeholder="可選填：食量、狀況..."
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
          {editRecord ? '更新紀錄' : '儲存紀錄'}
        </button>
      </div>
    </Modal>
  )
}
