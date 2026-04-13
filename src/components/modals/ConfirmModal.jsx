import React from 'react'
import Modal from '../Modal'

export default function ConfirmModal({
  isOpen,
  title = '確認',
  message,
  confirmLabel = '確認',
  confirmStyle = 'default',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  const isDanger = confirmStyle === 'danger'

  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
              isDanger
                ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
                : 'bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
