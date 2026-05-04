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

const colorOptions = ['黃色', '綠色', '黃褐色', '紅色', '棕色', '黑色', '灰白']
const consistencyOptions = ['顆粒', '硬', '正常', '鬆軟', '黏稠', '稀']
const amountOptions = ['少量', '中等', '量多']
export default function QuickDiaperModal({ onClose, type = 'diaper', editRecord }) {
  const { addRecord, updateRecord } = useApp()
  const isPumping = type === 'pumping'

  const [form, setForm] = useState(isPumping ? {
    time: editRecord?.time || getCurrentTime(),
    title: editRecord?.title || '',
    notes: editRecord?.notes || '',
  } : {
    time: editRecord?.time || getCurrentTime(),
    diaperType: editRecord?.diaperType || 'wet',
    color: editRecord?.color || '',
    consistency: editRecord?.consistency || '',
    amount: editRecord?.amount || '',
    notes: editRecord?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const recordType = isPumping ? 'pumping' : 'diaper'
      if (editRecord) {
        await updateRecord(recordType, { ...editRecord, ...form })
        toast.success('已更新')
      } else {
        await addRecord(recordType, form)
        toast.success(isPumping ? '其他記錄已新增 ✨' : '尿布記錄已新增 🫧')
      }
      onClose()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title={isPumping ? '其他記錄' : '尿布記錄'} onClose={onClose}>
      <div className="space-y-4">
        {/* Time */}
        <div>
          <label className="form-label">時間</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className="form-input" />
        </div>

        {isPumping ? (
          <>
            {/* Title */}
            <div>
              <label className="form-label">事件名稱</label>
              <input type="text" placeholder="例如：看醫生、洗澡、外出..." value={form.title} onChange={e => set('title', e.target.value)} className="form-input" />
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
            {/* Color, Consistency, Amount — only for dirty/mixed */}
            {form.diaperType !== 'wet' && form.diaperType !== 'dry' && (
              <>
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
                <div>
                  <label className="form-label">形狀</label>
                  <div className="flex gap-2 flex-wrap">
                    {consistencyOptions.map(c => (
                      <button
                        key={c}
                        onClick={() => set('consistency', form.consistency === c ? '' : c)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
                          form.consistency === c ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">多寡</label>
                  <div className="flex gap-2">
                    {amountOptions.map(a => (
                      <button
                        key={a}
                        onClick={() => set('amount', form.amount === a ? '' : a)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
                          form.amount === a ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
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
