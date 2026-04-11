import React from 'react'

export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-base font-medium text-gray-700 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary text-sm px-5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
