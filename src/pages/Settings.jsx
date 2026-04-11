import React, { useState } from 'react'
import { Save, Plus, Trash2, Github, Database, Bell, Info, ChevronRight, Eye, EyeOff, FileUp, Copy, ClipboardPaste } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { generateId } from '../services/github'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const AVATARS = ['👶', '🧒', '👦', '👧', '🐣', '🌸', '⭐', '🌈']

export default function Settings() {
  const navigate = useNavigate()
  const { github, isGitHubConfigured, autoConfigured, babies, activeBabyId, updateGitHub, saveBaby, deleteBaby, setActiveBaby } = useApp()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [githubForm, setGithubForm] = useState({ ...github })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showBabyModal, setShowBabyModal] = useState(false)
  const [editBaby, setEditBaby] = useState(null)
  const [shareCode, setShareCode] = useState('')
  const [showShareCode, setShowShareCode] = useState(false)

  const handleCopyShareCode = () => {
    if (!isGitHubConfigured) { toast.error('請先完成 GitHub 設定'); return }
    const code = btoa(JSON.stringify({ token: github.token, owner: github.owner, repo: github.repo }))
    navigator.clipboard.writeText(code).then(() => toast.success('設定碼已複製，請透過私訊傳給家人'))
    setShowShareCode(false)
  }

  const handleImportShareCode = async () => {
    if (!shareCode.trim()) { toast.error('請貼上設定碼'); return }
    try {
      const config = JSON.parse(atob(shareCode.trim()))
      if (!config.token || !config.owner || !config.repo) throw new Error()
      setGithubForm(config)
      setSaving(true)
      await updateGitHub(config)
      setSaving(false)
      setShareCode('')
      setShowShareCode(false)
    } catch {
      toast.error('設定碼無效，請確認內容正確')
    }
  }

  const handleSaveGitHub = async () => {
    if (!githubForm.token || !githubForm.owner || !githubForm.repo) {
      toast.error('請填寫所有 GitHub 設定')
      return
    }
    setSaving(true)
    await updateGitHub(githubForm)
    setSaving(false)
  }

  const handleSaveBaby = async (babyData) => {
    await saveBaby(babyData)
    setShowBabyModal(false)
    setEditBaby(null)
    toast.success(editBaby ? '寶寶資料已更新 👶' : '新寶寶已新增 🎉')
  }

  const handleDeleteBaby = async (babyId) => {
    await deleteBaby(babyId)
    setConfirmDeleteId(null)
    toast.success('已刪除寶寶資料')
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 animate-fade-in">
      {/* Babies section */}
      <Section title="寶寶管理" icon="👶">
        {babies.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">還沒有新增寶寶</p>
        ) : (
          <div className="space-y-2">
            {babies.map(baby => (
              <div
                key={baby.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  baby.id === activeBabyId ? 'border-pink-200 bg-pink-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <button onClick={() => setActiveBaby(baby.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left touch-manipulation">
                  <span className="text-2xl">{baby.avatar || '👶'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{baby.name}</p>
                    <p className="text-xs text-gray-400">
                      {baby.birthdate ? `生日：${baby.birthdate}` : ''}
                      {baby.gender ? ` · ${baby.gender === 'boy' ? '男寶' : '女寶'}` : ''}
                    </p>
                  </div>
                  {baby.id === activeBabyId && <span className="tag bg-pink-200 text-pink-700">目前</span>}
                </button>
                <button onClick={() => { setEditBaby(baby); setShowBabyModal(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 touch-manipulation">
                  <ChevronRight size={16} />
                </button>
                {confirmDeleteId === baby.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDeleteBaby(baby.id)} className="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-medium touch-manipulation">確認刪除</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs touch-manipulation">取消</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(baby.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 touch-manipulation">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => { setEditBaby(null); setShowBabyModal(true) }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 text-sm font-medium mt-2 hover:bg-pink-50 transition-colors touch-manipulation"
        >
          <Plus size={16} /> 新增寶寶
        </button>
      </Section>

      {/* GitHub section */}
      <Section title="GitHub 雲端同步" icon="☁️">
        <div className="mb-3">
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${isGitHubConfigured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {isGitHubConfigured ? '✅ 已連線 — 資料同步至 GitHub' : '⚠️ 未設定 — 資料僅存本機'}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label">Personal Access Token (PAT)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubForm.token}
                onChange={e => setGithubForm(f => ({ ...f, token: e.target.value }))}
                className="form-input pr-10"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">需要 Contents: Read & Write 權限</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">GitHub 帳號</label>
              <input
                type="text"
                placeholder="username"
                value={githubForm.owner}
                onChange={e => setGithubForm(f => ({ ...f, owner: e.target.value }))}
                className="form-input"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="form-label">Repository 名稱</label>
              <input
                type="text"
                placeholder="baby-diary-data"
                value={githubForm.repo}
                onChange={e => setGithubForm(f => ({ ...f, repo: e.target.value }))}
                className="form-input"
                autoCapitalize="none"
              />
            </div>
          </div>

          <button onClick={handleSaveGitHub} disabled={saving} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            {saving ? '連線中...' : '儲存並測試連線'}
          </button>

          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 font-medium mb-1">🔒 安全提示</p>
            <p className="text-xs text-blue-600">
              PAT 只會儲存在您裝置的瀏覽器本機，不會出現在程式碼或伺服器。
              建議使用 Fine-grained token，只開放 <strong>baby-diary-data</strong> repo 讀寫權限。
            </p>
          </div>
        </div>
      </Section>

      {/* Family share code */}
      <Section title="家人協作" icon="👨‍👩‍👧">
        <p className="text-xs text-gray-500 mb-3">
          產生設定碼後，透過私訊傳給家人；家人貼上設定碼即可連線同一份資料，無需手動輸入帳號。
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopyShareCode}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-pink-200 bg-pink-50 text-pink-600 text-sm font-medium hover:bg-pink-100 transition-colors touch-manipulation"
          >
            <Copy size={15} /> 複製設定碼
          </button>
          <button
            onClick={() => setShowShareCode(v => !v)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ClipboardPaste size={15} /> 貼上設定碼
          </button>
        </div>
        {showShareCode && (
          <div className="mt-3 space-y-2">
            <textarea
              rows={3}
              placeholder="將家人傳來的設定碼貼在這裡"
              value={shareCode}
              onChange={e => setShareCode(e.target.value)}
              className="form-input resize-none text-xs font-mono"
            />
            <button
              onClick={handleImportShareCode}
              disabled={saving}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : null}
              {saving ? '連線中...' : '套用設定碼'}
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">⚠️ 設定碼包含 PAT，請只透過私訊等私密管道分享</p>
      </Section>

      {/* Data Import */}
      <Section title="資料匯入" icon="📥">
        <p className="text-xs text-gray-500 mb-3">
          將其他寶寶記錄 App 的資料以 CSV 格式匯出後，即可匯入到這裡。支援喝奶、睡眠、尿布、成長記錄。
        </p>
        <button
          onClick={() => navigate('/import')}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-pink-50 hover:border-pink-200 transition-colors touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
              <FileUp size={16} className="text-pink-500" />
            </div>
            <span className="text-sm font-medium text-gray-700">CSV 資料匯入</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </Section>

      {/* App info */}
      <Section title="關於" icon="ℹ️">
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>版本</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>資料儲存</span>
            <span>{isGitHubConfigured ? 'GitHub + 本機' : '本機'}</span>
          </div>
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            寶寶成長日記 — 記錄每個珍貴的時刻 🍼
          </div>
        </div>
      </Section>

      {/* Baby modal */}
      {showBabyModal && (
        <BabyModal
          editBaby={editBaby}
          onSave={handleSaveBaby}
          onClose={() => { setShowBabyModal(false); setEditBaby(null) }}
          avatars={AVATARS}
        />
      )}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

function BabyModal({ editBaby, onSave, onClose, avatars }) {
  const [form, setForm] = useState({
    id: editBaby?.id || generateId(),
    name: editBaby?.name || '',
    birthdate: editBaby?.birthdate || '',
    gender: editBaby?.gender || '',
    avatar: editBaby?.avatar || '👶',
    notes: editBaby?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('請輸入寶寶名稱'); return }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title={editBaby ? '編輯寶寶資料' : '新增寶寶'} onClose={onClose}>
      <div className="space-y-4">
        {/* Avatar */}
        <div>
          <label className="form-label">頭像</label>
          <div className="flex gap-2 flex-wrap">
            {avatars.map(av => (
              <button
                key={av}
                onClick={() => set('avatar', av)}
                className={`text-2xl p-2 rounded-xl transition-all touch-manipulation ${form.avatar === av ? 'bg-pink-100 ring-2 ring-pink-300 scale-110' : 'hover:bg-gray-100'}`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">寶寶名字 *</label>
          <input type="text" placeholder="小寶" value={form.name} onChange={e => set('name', e.target.value)} className="form-input" />
        </div>

        <div>
          <label className="form-label">生日</label>
          <input type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} className="form-input" />
        </div>

        <div>
          <label className="form-label">性別</label>
          <div className="flex gap-3">
            {[{ v: 'boy', l: '👦 男寶' }, { v: 'girl', l: '👧 女寶' }].map(g => (
              <button
                key={g.v}
                onClick={() => set('gender', form.gender === g.v ? '' : g.v)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all touch-manipulation ${
                  form.gender === g.v ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {g.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">備註</label>
          <textarea placeholder="過敏記錄、特殊注意..." value={form.notes} onChange={e => set('notes', e.target.value)} className="form-input resize-none" rows={2} />
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full btn-primary py-3">
          {saving ? '儲存中...' : editBaby ? '更新資料' : '新增寶寶'}
        </button>
      </div>
    </Modal>
  )
}
