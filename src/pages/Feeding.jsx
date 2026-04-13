import React, { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import QuickFeedingModal from '../components/modals/QuickFeedingModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

const feedTypeLabel = { breast: '親餵', bottle: '瓶餵', pumped: '母乳瓶餵' }
const feedTypeIcon = { breast: '🤱', bottle: '🍼', pumped: '🥛' }

export default function Feeding() {
  const { today, deleteRecord, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const records = today?.feeding || []
  const totalAmount = records.reduce((s, r) => s + (r.amount || 0), 0)
  const totalDuration = records.reduce((s, r) => s + (r.duration || 0), 0)

  const handleDelete = (id) => {
    setConfirmState({ id })
  }

  const handleEdit = (record) => {
    setEditRecord(record)
    setShowModal(true)
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Summary */}
      {records.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今日統計</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatItem label="次數" value={`${records.length}次`} color="text-blue-500" />
            <StatItem label="總奶量" value={totalAmount > 0 ? `${totalAmount}ml` : '—'} color="text-blue-500" />
            <StatItem label="哺乳時長" value={totalDuration > 0 ? `${totalDuration}分` : '—'} color="text-blue-500" />
          </div>
        </div>
      )}

      {/* Records list */}
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

        {loading ? (
          <LoadingCards />
        ) : records.length === 0 ? (
          <EmptyState
            icon="🍼"
            title="還沒有喝奶記錄"
            subtitle="點擊新增按鈕開始記錄"
            action={{ label: '新增記錄', onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            {records.map((record, idx) => (
              <div
                key={record.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx < records.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                {/* Type icon */}
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{feedTypeIcon[record.feedType] || '🍼'}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{record.time}</span>
                    <span className="tag bg-blue-100 text-blue-600">{feedTypeLabel[record.feedType] || record.feedType}</span>
                    {record.side && <span className="tag bg-pink-100 text-pink-600">{record.side === 'left' ? '左' : record.side === 'right' ? '右' : '雙'}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[record.amount ? `${record.amount}ml` : null, record.duration ? `${record.duration}分鐘` : null, record.notes].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(record)} className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-400 touch-manipulation">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 text-gray-400 hover:text-red-400 touch-manipulation">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add FAB */}
      <button
        onClick={() => { setEditRecord(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-pink-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <QuickFeedingModal
          onClose={() => { setShowModal(false); setEditRecord(null) }}
          editRecord={editRecord}
        />
      )}
      <ConfirmModal
        isOpen={!!confirmState}
        title="確認刪除"
        message="確定刪除此記錄？"
        confirmLabel="刪除"
        confirmStyle="danger"
        onConfirm={() => { deleteRecord('feeding', confirmState.id); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}

function StatItem({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function LoadingCards() {
  return (
    <div className="card space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
