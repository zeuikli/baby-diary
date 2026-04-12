import React, { useState } from 'react'
import Modal from '../Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const diaperTypes = [
  { value: 'wet', label: '尿尿', icon: '💧' },
  { value: 'dirty', label: '便便', icon: '💩' },
  { value: 'mixed', label: '混合', icon: '🌊' },
  { value: 'dry', label: '乾淨', icon: '✨' },
]

const colorOptions = ['黃色', '棕色', '綠色', '黑色']
const pumpSides = [
  { value: 'left', label: '左側' },
  { value: 'right', label: '右側' },
  { value: 'both', label: '雙側' },
]

export default function QuickDiaperModal({ onClose, type = 'diaper', editRecord }) {
  const { addRecord, updateRecord } = useApp()
  const isPumping = type === 'pumping'

  const [form, setForm] = useState(isPumping ? {
    time: editRecord?.time || getCurrentTime(),
    side: editRecord?.side || 'both',
    amount: editRecord?.amount || '',
    duration: editRecord?.duration || '',
    notes: editRecord?.notes || '',
  } : {
    time: editRecord?.time || getCurrentTime(),
    diaperType: editRecord?.diaperType || 'wet',
    color: editRecord?.color || '',
    notes: editRecord?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const recordType = isPumping ? 'pumping' : 'diaper'
      const record = isPumping
        ? { ...form, amount: form.amount ? Number(form.amount) : null, duration: form.duration ? Number(form.duration) : null }
        : form

      if (editRecord) {
        await updateRecord(recordType, { ...editRecord, ...record })
        toast.success('已更新')
      } else {
        await addRecord(recordType, record)
        toast.success(isPumping ? '擠奶記錄已新增 🤱' : '尿布記錄已新增 🫧')
      }
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title={isPumping ? '擠奶記錄' : '尿布記錄'} onClose={onClose}>
      <div className="space-y-4">
        {/* Time */}
        <div>
          <label className="form-label">時間</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className="form-input" />
        </div>

        {isPumping ? (
          <>
            {/* Side */}
            <div>
              <label className="form-label">側邊</label>
              <div className="flex gap-2">
                {pumpSides.map(s => (
                  <button
                    key={s.value}
                    onClick={() => set('side', s.value)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all touch-manipulation ${
                      form.side === s.value ? 'bg-pink-50 border-pink-300 text-pink-600' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Amount & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">奶量 (ml)</label>
                <input type="number" placeholder="100" value={form.amount} onChange={e => set('amount', e.target.value)} className="form-input" inputMode="numeric" />
              </div>
              <div>
                <label className="form-label">時間 (分鐘)</label>
                <input type="number" placeholder="15" value={form.duration} onChange={e => set('duration', e.target.value)} className="form-input" inputMode="numeric" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Diaper type */}
            <div>
              <label className="form-label">類型</label>
              <div className="grid grid-cols-4 gap-2">
                {diaperTypes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => set('diaperType', t.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
                      form.diaperType === t.value ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Color */}
            {form.diaperType !== 'wet' && form.diaperType !== 'dry' && (
              <div>
                <label className="form-label">顏色</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => set('color', form.color === c ? '' : c)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
                        form.color === c ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <div>
          <label className="form-label">備註</label>
          <textarea placeholder="可選填..." value={form.notes} onChange={e => set('notes', e.target.value)} className="form-input resize-none" rows={2} />
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full btn-primary py-3">
          {saving ? '儲存中...' : editRecord ? '更新紀錄' : '儲存紀錄'}
        </button>
      </div>
    </Modal>
  )
}
