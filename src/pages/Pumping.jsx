import React, { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import QuickDiaperModal from '../components/modals/QuickDiaperModal'
import EmptyState from '../components/EmptyState'

export default function Other() {
  const { today, deleteRecord } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const records = today?.pumping || []

  const handleDelete = (id) => {
    if (confirm('確定刪除此記錄？')) {
      deleteRecord('pumping', id)
    }
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Records */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">其他紀錄</h2>
          <button onClick={() => { setEditRecord(null); setShowModal(true) }} className="flex items-center gap-1 text-xs text-violet-500 font-medium px-2 py-1 bg-violet-50 rounded-lg touch-manipulation">
            <Plus size={14} /> 新增
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="✨" title="還沒有其他紀錄" action={{ label: '新增紀錄', onClick: () => setShowModal(true) }} />
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...records].reverse().map((record, idx) => (
              <div key={record.id} className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{record.time}</span>
                    {record.title && <span className="tag bg-violet-100 text-violet-600">{record.title}</span>}
                  </div>
                  {record.notes && <p className="text-xs text-gray-400 mt-0.5">{record.notes}</p>}
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
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditRecord(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-violet-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <QuickDiaperModal type="pumping" editRecord={editRecord} onClose={() => { setShowModal(false); setEditRecord(null) }} />
      )}
    </div>
  )
}
