import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit2, Image, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { githubService, generateId, formatDate } from '../services/github'
import { ls } from '../services/localStorage'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

function getCurrentDate() {
  return formatDate()
}

// Compress image to base64 < 200KB
async function compressImage(file, maxKB = 200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        const maxSize = 800
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize }
          else { w = (w / h) * maxSize; h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        let quality = 0.8
        let result = canvas.toDataURL('image/jpeg', quality)
        while (result.length > maxKB * 1024 * 1.37 && quality > 0.2) {
          quality -= 0.1
          result = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(result)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Diary() {
  const { activeBabyId } = useApp()
  const [entries, setEntries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  const loadEntries = useCallback(async () => {
    if (!activeBabyId) return
    setLoading(true)
    try {
      let data = []
      if (githubService.isConfigured) {
        data = await githubService.getDiaryEntries(activeBabyId, currentMonth.year, currentMonth.month)
      } else {
        data = ls.get(`diary_${activeBabyId}_${currentMonth.year}_${currentMonth.month}`) || []
      }
      setEntries(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeBabyId, currentMonth])

  useEffect(() => { loadEntries() }, [loadEntries])

  const handleSave = async (entryData) => {
    try {
      const entry = {
        id: editEntry?.id || generateId(),
        date: entryData.date,
        title: entryData.title,
        content: entryData.content,
        photos: entryData.photos || [],
        mood: entryData.mood,
        tags: entryData.tags || [],
        createdAt: editEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      let updated
      if (githubService.isConfigured) {
        updated = await githubService.saveDiaryEntry(activeBabyId, entry)
      } else {
        const all = entries.filter(e => e.id !== entry.id)
        updated = [entry, ...all]
        ls.set(`diary_${activeBabyId}_${currentMonth.year}_${currentMonth.month}`, updated)
      }
      setEntries(updated)
      toast.success(editEntry ? '日記已更新 📖' : '日記已儲存 📖')
      setShowModal(false)
      setEditEntry(null)
    } catch {
      toast.error('儲存失敗')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此日記？')) return
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    if (githubService.isConfigured) {
      const { year, month } = currentMonth
      await githubService.putFile(`${activeBabyId}/diary/${year}-${String(month).padStart(2,'0')}.json`, updated, 'Delete diary entry')
    } else {
      ls.set(`diary_${activeBabyId}_${currentMonth.year}_${currentMonth.month}`, updated)
    }
    toast.success('已刪除')
  }

  const handleMonthChange = (delta) => {
    setCurrentMonth(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      return { year: y, month: m }
    })
  }

  const moods = ['😊', '😄', '😢', '😴', '🤒', '🎉']

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-2.5 shadow-sm">
        <button onClick={() => handleMonthChange(-1)} className="p-1.5 rounded-xl hover:bg-gray-100 touch-manipulation">‹</button>
        <span className="text-sm font-medium text-gray-700">{currentMonth.year}年 {currentMonth.month}月</span>
        <button
          onClick={() => handleMonthChange(1)}
          disabled={currentMonth.year >= new Date().getFullYear() && currentMonth.month >= new Date().getMonth() + 1}
          className="p-1.5 rounded-xl hover:bg-gray-100 disabled:opacity-30 touch-manipulation"
        >›</button>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="📖"
          title="這個月還沒有日記"
          subtitle="記錄寶寶的珍貴時刻"
          action={{ label: '寫日記', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{entry.date}</span>
                    {entry.mood && <span className="text-base">{entry.mood}</span>}
                    {entry.tags?.map(tag => (
                      <span key={tag} className="tag bg-pink-100 text-pink-600">{tag}</span>
                    ))}
                  </div>
                  {entry.title && <h3 className="text-sm font-semibold text-gray-800 mb-1">{entry.title}</h3>}
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{entry.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditEntry(entry); setShowModal(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 touch-manipulation">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 touch-manipulation">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* Photos */}
              {entry.photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {entry.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="h-24 w-24 object-cover rounded-xl flex-shrink-0" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditEntry(null); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-pink-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <DiaryModal
          editEntry={editEntry}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(null) }}
          moods={moods}
        />
      )}
    </div>
  )
}

function DiaryModal({ editEntry, onSave, onClose, moods }) {
  const fileRef = useRef()
  const [form, setForm] = useState({
    date: editEntry?.date || getCurrentDate(),
    title: editEntry?.title || '',
    content: editEntry?.content || '',
    photos: editEntry?.photos || [],
    mood: editEntry?.mood || '',
    tags: editEntry?.tags || [],
  })
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhoto = async (e) => {
    const files = Array.from(e.target.files)
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    set('photos', [...form.photos, ...compressed])
  }

  const removePhoto = (idx) => set('photos', form.photos.filter((_, i) => i !== idx))

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      set('tags', [...form.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleSave = async () => {
    if (!form.content.trim()) { toast.error('請填寫日記內容'); return }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title={editEntry ? '編輯日記' : '寫日記'} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <label className="form-label">日期</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="form-input" />
        </div>

        {/* Mood */}
        <div>
          <label className="form-label">心情</label>
          <div className="flex gap-2">
            {moods.map(m => (
              <button key={m} onClick={() => set('mood', form.mood === m ? '' : m)} className={`text-2xl p-1.5 rounded-xl transition-all touch-manipulation ${form.mood === m ? 'bg-pink-100 scale-110' : 'hover:bg-gray-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">標題（可選）</label>
          <input type="text" placeholder="今天的主題..." value={form.title} onChange={e => set('title', e.target.value)} className="form-input" />
        </div>

        <div>
          <label className="form-label">內容 *</label>
          <textarea
            placeholder="記錄寶寶今天的點點滴滴..."
            value={form.content}
            onChange={e => set('content', e.target.value)}
            className="form-input resize-none"
            rows={5}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="form-label">標籤</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {form.tags.map(tag => (
              <span key={tag} className="tag bg-pink-100 text-pink-600 flex items-center gap-1">
                {tag}
                <button onClick={() => set('tags', form.tags.filter(t => t !== tag))} className="touch-manipulation">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="新增標籤..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              className="form-input flex-1"
            />
            <button onClick={addTag} className="btn-secondary px-3">新增</button>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="form-label">相片</label>
          <div className="flex gap-2 flex-wrap">
            {form.photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={p} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center touch-manipulation"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-pink-300 hover:text-pink-400 transition-colors touch-manipulation"
            >
              <Image size={18} />
              <span className="text-xs">新增</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full btn-primary py-3">
          {saving ? '儲存中...' : editEntry ? '更新日記' : '儲存日記'}
        </button>
      </div>
    </Modal>
  )
}
