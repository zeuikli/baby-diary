import React, { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import QuickDiaperModal from '../components/modals/QuickDiaperModal'
import EmptyState from '../components/EmptyState'

const typeConfig = {
  wet: { label: '尿尿', icon: '💧', bg: 'bg-blue-50', text: 'text-blue-600' },
  dirty: { label: '便便', icon: '💩', bg: 'bg-amber-50', text: 'text-amber-600' },
  mixed: { label: '混合', icon: '🌊', bg: 'bg-teal-50', text: 'text-teal-600' },
  dry: { label: '乾淨', icon: '✨', bg: 'bg-gray-50', text: 'text-gray-600' },
}

export default function Diaper() {
  const { today, deleteRecord, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const records = today?.diaper || []

  const wetCount = records.filter(r => r.diaperType === 'wet' || r.diaperType === 'mixed').length
  const dirtyCount = records.filter(r => r.diaperType === 'dirty' || r.diaperType === 'mixed').length

  const handleDelete = (type, id) => {
    if (confirm('確定刪除此記錄？')) {
      deleteRecord(type, id)
    }
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Summary */}
      {records.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日統計</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{records.length}次</div>
              <div className="text-xs text-gray-400">換尿布</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{wetCount}次</div>
              <div className="text-xs text-gray-400">尿尿</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">{dirtyCount}次</div>
              <div className="text-xs text-gray-400">便便</div>
            </div>
          </div>
        </div>
      )}

      {/* Diaper Records */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">尿布記錄</h2>
          <button onClick={() => { setEditRecord(null); setShowModal(true) }} className="flex items-center gap-1 text-xs text-pink-500 font-medium px-2 py-1 bg-pink-50 rounded-lg touch-manipulation">
            <Plus size={14} /> 新增
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="🫧" title="還沒有尿布記錄" action={{ label: '新增記錄', onClick: () => setShowModal(true) }} />
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...records].reverse().map((record, idx) => {
              const cfg = typeConfig[record.diaperType] || typeConfig.wet
              return (
                <div key={record.id} className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xl">{cfg.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{record.time}</span>
                      <span className={`tag ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      {record.color && <span className="tag bg-amber-50 text-amber-700">{record.color}</span>}
                      {record.consistency && <span className="tag bg-orange-50 text-orange-700">{record.consistency}</span>}
                      {record.amount && <span className="tag bg-teal-50 text-teal-700">{record.amount}</span>}
                    </div>
                    {record.notes && <p className="text-xs text-gray-400 mt-0.5">{record.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditRecord(record); setShowModal(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 touch-manipulation">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete('diaper', record.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 touch-manipulation">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditRecord(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-yellow-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <QuickDiaperModal type="diaper" editRecord={editRecord} onClose={() => { setShowModal(false); setEditRecord(null) }} />
      )}
    </div>
  )
}
