import React from 'react'
import EmptyState from './EmptyState'

const TYPE_CONFIG = {
  feeding: { icon: '🍼', color: 'bg-blue-100', textColor: 'text-blue-600', dotColor: 'bg-blue-400' },
  sleep: { icon: '😴', color: 'bg-purple-100', textColor: 'text-purple-600', dotColor: 'bg-purple-400' },
  diaper: { icon: '🫧', color: 'bg-yellow-100', textColor: 'text-yellow-600', dotColor: 'bg-yellow-400' },
  pumping: { icon: '🤱', color: 'bg-pink-100', textColor: 'text-pink-600', dotColor: 'bg-pink-400' },
  solids: { icon: '🥣', color: 'bg-green-100', textColor: 'text-green-600', dotColor: 'bg-green-400' },
  notes: { icon: '📝', color: 'bg-gray-100', textColor: 'text-gray-600', dotColor: 'bg-gray-400' },
}

function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDuration(start, end) {
  if (!start || !end) return null
  const s = new Date(`2000-01-01T${start}`)
  const e = new Date(`2000-01-01T${end}`)
  let diff = (e - s) / 60000
  if (diff < 0) diff += 24 * 60
  const h = Math.floor(diff / 60)
  const m = Math.floor(diff % 60)
  return h > 0 ? `${h}h${m}m` : `${m}分鐘`
}

function getRecordText(type, record) {
  switch (type) {
    case 'feeding':
      return [
        record.feedType === 'breast' ? '親餵' : record.feedType === 'bottle' ? '瓶餵' : '母乳瓶餵',
        record.amount ? `${record.amount}ml` : null,
        record.side ? (record.side === 'left' ? '左側' : '右側') : null,
      ].filter(Boolean).join(' · ')
    case 'sleep':
      return [
        record.end ? formatDuration(record.start, record.end) : '進行中...',
        record.end ? `結束 ${formatTime(record.end)}` : null,
      ].filter(Boolean).join(' · ')
    case 'diaper':
      return [
        record.diaperType === 'wet' ? '濕尿布' : record.diaperType === 'dirty' ? '便便' : '混合',
        record.color ? record.color : null,
      ].filter(Boolean).join(' · ')
    case 'pumping':
      return [
        record.amount ? `${record.amount}ml` : null,
        record.side === 'both' ? '雙側' : record.side === 'left' ? '左側' : '右側',
      ].filter(Boolean).join(' · ')
    case 'solids':
      return [record.food, record.reaction].filter(Boolean).join(' · ')
    default:
      return record.content || ''
  }
}

export default function Timeline({ today, onEditRecord }) {
  if (!today) return null

  // Flatten all events
  const events = []

  const types = ['feeding', 'sleep', 'diaper', 'pumping', 'solids', 'notes']
  for (const type of types) {
    const records = today[type] || []
    for (const record of records) {
      const time = record.time || record.start
      if (time) {
        events.push({ type, record, time })
      }
    }
  }

  events.sort((a, b) => b.time.localeCompare(a.time))

  if (events.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="今天還沒有記錄"
        subtitle="點擊上方按鈕開始記錄"
      />
    )
  }

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      {events.map(({ type, record, time }, idx) => {
        const config = TYPE_CONFIG[type] || TYPE_CONFIG.notes
        const isLast = idx === events.length - 1

        return (
          <button
            key={record.id || idx}
            onClick={() => onEditRecord?.(type, record)}
            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left touch-manipulation ${!isLast ? 'border-b border-gray-50' : ''}`}
          >
            {/* Time */}
            <div className="w-12 flex-shrink-0 text-center">
              <span className="text-xs font-medium text-gray-500">{formatTime(time)}</span>
            </div>

            {/* Dot */}
            <div className="flex flex-col items-center flex-shrink-0 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
              {!isLast && <div className="w-0.5 flex-1 bg-gray-100 min-h-4 mt-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{config.icon}</span>
                <span className={`text-xs font-medium ${config.textColor}`}>
                  {type === 'feeding' ? '喝奶' :
                   type === 'sleep' ? '睡眠' :
                   type === 'diaper' ? '尿布' :
                   type === 'pumping' ? '擠奶' :
                   type === 'solids' ? '副食品' : '備註'}
                </span>
                {type === 'sleep' && !record.end && (
                  <span className="tag bg-purple-100 text-purple-600 animate-pulse-soft">進行中</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{getRecordText(type, record)}</p>
              {record.notes && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{record.notes}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
