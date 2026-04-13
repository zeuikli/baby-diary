import React, { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import QuickSolidsModal from '../components/modals/QuickSolidsModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import EmptyState from '../components/EmptyState'

const reactionConfig = {
  '喜歡': { icon: '😋', bg: 'bg-green-50', text: 'text-green-600' },
  '接受': { icon: '🙂', bg: 'bg-blue-50', text: 'text-blue-600' },
  '拒絕': { icon: '😣', bg: 'bg-orange-50', text: 'text-orange-600' },
  '過敏': { icon: '⚠️', bg: 'bg-red-50', text: 'text-red-600' },
}

export default function Solids() {
  const { today, deleteRecord } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const records = today?.solids || []

  const handleDelete = (id) => {
    setConfirmState({ id })
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Summary */}
      {records.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日統計</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{records.length}次</div>
              <div className="text-xs text-gray-400">副食品</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {[...new Set(records.flatMap(r => (r.food || '').split('、').filter(Boolean)))].length}種
              </div>
              <div className="text-xs text-gray-400">食物種類</div>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">副食品紀錄</h2>
          <button onClick={() => { setEditRecord(null); setShowModal(true) }} className="flex items-center gap-1 text-xs text-pink-500 font-medium px-2 py-1 bg-pink-50 rounded-lg touch-manipulation">
            <Plus size={14} /> 新增
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="🥣" title="還沒有副食品記錄" action={{ label: '新增記錄', onClick: () => setShowModal(true) }} />
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...records].reverse().map((record, idx) => {
              const rCfg = reactionConfig[record.reaction] || {}
              return (
                <div key={record.id} className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🥣</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{record.time}</span>
                      {record.reaction && (
                        <span className={`tag ${rCfg.bg || 'bg-gray-100'} ${rCfg.text || 'text-gray-600'}`}>
                          {rCfg.icon || ''} {record.reaction}
                        </span>
                      )}
                    </div>
                    {record.food && <p className="text-xs text-gray-600 mt-0.5">{record.food}{record.amount ? ` · ${record.amount}ml` : ''}</p>}
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
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditRecord(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-green-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <QuickSolidsModal editRecord={editRecord} onClose={() => { setShowModal(false); setEditRecord(null) }} />
      )}
      <ConfirmModal
        isOpen={!!confirmState}
        title="確認刪除"
        message="確定刪除此記錄？"
        confirmLabel="刪除"
        confirmStyle="danger"
        onConfirm={() => { deleteRecord('solids', confirmState.id); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
