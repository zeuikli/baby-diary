import React, { useState, useRef, useEffect } from 'react'
import { Save, Plus, Trash2, Github, Database, Bell, Info, ChevronRight, Eye, EyeOff, FileUp, FileDown, Copy, ClipboardPaste, Check, Lock, Unlock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { generateId } from '../services/github'
import { settings as settingsStore, unlockedProfiles } from '../services/localStorage'
import { hashPassword } from '../utils/crypto'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const AVATARS = ['👶', '🧒', '👦', '👧', '🐣', '🌸', '⭐', '🌈']

export default function Settings() {
  const navigate = useNavigate()
  const { github, isGitHubConfigured, autoConfigured, babies, activeBabyId, updateGitHub, saveBaby, deleteBaby, setActiveBaby, enableDiary, setEnableDiary } = useApp()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [githubForm, setGithubForm] = useState(() => {
    const savedToken = settingsStore.get()?.github?.token || ''
    return { token: savedToken, owner: github.owner, repo: github.repo }
  })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showBabyModal, setShowBabyModal] = useState(false)
  const [editBaby, setEditBaby] = useState(null)
  const [shareCode, setShareCode] = useState('')
  const [showShareCode, setShowShareCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharePin, setSharePin] = useState('')
  const copyTimeoutRef = useRef(null)

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
  }, [])

  const [generatedCode, setGeneratedCode] = useState('')

  const handleCopyShareCode = async () => {
    if (!isGitHubConfigured) { toast.error('請先完成 GitHub 設定'); return }
    if (sharePin.length < 6) { toast.error('加密密碼至少需要 6 個字元'); return }

    if (!window.isSecureContext || !crypto.subtle) {
      toast.error('加密功能需要 HTTPS 安全連線，請確認網址為 https:// 或 localhost')
      return
    }

    try {
      const enc = new TextEncoder()
      const savedToken = settingsStore.get()?.github?.token || ''
      const plain = enc.encode(JSON.stringify({ token: savedToken, owner: github.owner, repo: github.repo }))
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(sharePin), 'PBKDF2', false, ['deriveKey'])
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
      const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length)
      packed.set(salt, 0)
      packed.set(iv, salt.length)
      packed.set(new Uint8Array(encrypted), salt.length + iv.length)
      const code = btoa(String.fromCharCode(...packed))

      // 嘗試使用 Clipboard API，失敗則顯示設定碼供手動複製
      try {
        await navigator.clipboard.writeText(code)
        toast.success('設定碼已加密複製，請把密碼和設定碼透過私訊傳給家人')
        setCopied(true)
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 1800)
      } catch {
        setGeneratedCode(code)
        toast.success('加密成功！請手動複製下方的設定碼')
      }
    } catch (e) {
      toast.error('加密失敗：' + (e.message || '未知錯誤'))
    }
  }

  const handleImportShareCode = async () => {
    if (!shareCode.trim()) { toast.error('請貼上設定碼'); return }
    if (sharePin.length < 6) { toast.error('解密密碼至少需要 6 個字元'); return }
    if (!window.isSecureContext || !crypto.subtle) {
      toast.error('解密功能需要 HTTPS 安全連線，請確認網址為 https:// 或 localhost')
      return
    }
    try {
      let config
      try {
        const packed = Uint8Array.from(atob(shareCode.trim()), c => c.charCodeAt(0))
        if (packed.length < 29) throw new Error('資料太短')
        const salt = packed.slice(0, 16)
        const iv = packed.slice(16, 28)
        const ciphertext = packed.slice(28)
        const enc = new TextEncoder()
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(sharePin), 'PBKDF2', false, ['deriveKey'])
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
        config = JSON.parse(new TextDecoder().decode(decrypted))
      } catch {
        toast.error('解密失敗，請確認密碼和設定碼是否正確')
        return
      }
      const { token, owner, repo } = config
      if (typeof token !== 'string' || typeof owner !== 'string' || typeof repo !== 'string' || !token || !owner || !repo) {
        toast.error('設定碼欄位無效'); return
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
        toast.error('owner 或 repo 名稱包含不允許的字元'); return
      }
      if (!confirm(`確認要連線到 ${owner}/${repo} 嗎？\n設定碼將會把資料同步到此 Repo。`)) return
      const safeConfig = { token, owner, repo }
      setGithubForm(safeConfig)
      setSaving(true)
      await updateGitHub(safeConfig)
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors touch-manipulation ${
              copied
                ? 'border-green-300 bg-green-100 text-green-600'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {copied ? (
              <>
                <Check size={15} /> 已複製
              </>
            ) : (
              <>
                <Copy size={15} /> 複製設定碼
              </>
            )}
          </button>
          <button
            onClick={() => setShowShareCode(v => !v)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors touch-manipulation ${
              showShareCode
                ? 'border-pink-300 bg-pink-100 text-pink-600'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ClipboardPaste size={15} /> 貼上設定碼
          </button>
        </div>
        {generatedCode && (
          <div className="mt-3 space-y-2">
            <label className="form-label">加密設定碼（請手動全選複製）</label>
            <textarea
              rows={3}
              readOnly
              value={generatedCode}
              onFocus={e => e.target.select()}
              className="form-input resize-none text-xs font-mono bg-gray-50"
            />
            <button
              onClick={() => setGeneratedCode('')}
              className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors touch-manipulation"
            >
              關閉
            </button>
          </div>
        )}
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
        <div className="mt-3">
          <label className="form-label">加密密碼</label>
          <input
            type="password"
            autoComplete="off"
            placeholder="請輸入至少 6 個字元的密碼"
            value={sharePin}
            onChange={e => setSharePin(e.target.value)}
            className="form-input font-mono"
            maxLength={64}
          />
          <p className="text-xs text-gray-400 mt-1">至少 6 個字元，複製和貼上設定碼時需輸入相同密碼</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">⚠️ 設定碼已加密保護，請將密碼和設定碼分別透過不同管道傳給家人</p>
      </Section>

      {/* Feature toggles */}
      <Section title="功能開關" icon="🔧">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">育兒日記</p>
            <p className="text-xs text-gray-400">開啟後底部導覽列會出現「日記」頁面</p>
          </div>
          <button
            onClick={() => setEnableDiary(!enableDiary)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enableDiary ? 'bg-pink-400' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enableDiary ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </Section>

      {/* Data Import / Export */}
      <Section title="資料匯入 / 匯出" icon="📦">
        <p className="text-xs text-gray-500 mb-3">
          匯入其他 App 的 CSV 記錄，或匯出本 App 所有資料作為備份。匯出格式與匯入相同，可直接還原。
        </p>
        <div className="space-y-2">
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
          <button
            onClick={() => navigate('/export')}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FileDown size={16} className="text-green-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">CSV 資料匯出</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </Section>

      {/* App info */}
      <Section title="關於" icon="ℹ️">
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>版本</span>
            <span className="font-mono text-xs">
              {__APP_VERSION__} <span className="text-gray-400">({__APP_COMMIT__})</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span>建置時間</span>
            <span className="font-mono text-xs">{__APP_BUILD_DATE__} <span className="text-gray-400">(UTC+8)</span></span>
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
    passwordHash: editBaby?.passwordHash || '',
  })
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  // 'keep' = unchanged | 'set' = setting new password | 'remove' = removing password
  const [passwordAction, setPasswordAction] = useState('keep')

  const hasPassword = !!editBaby?.passwordHash

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('請輸入寶寶名稱'); return }

    let finalForm = { ...form }

    if (passwordAction === 'set') {
      if (newPassword.length < 4) { toast.error('密碼至少需要 4 個字元'); return }
      if (!window.crypto?.subtle) { toast.error('此裝置不支援加密功能'); return }
      try {
        finalForm.passwordHash = await hashPassword(newPassword)
        // New password means this device is already "unlocked"
        unlockedProfiles.add(finalForm.id)
      } catch {
        toast.error('密碼設定失敗')
        return
      }
    } else if (passwordAction === 'remove') {
      finalForm.passwordHash = ''
      unlockedProfiles.remove(finalForm.id)
    }

    setSaving(true)
    try {
      await onSave(finalForm)
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

        {/* Password protection */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            {hasPassword && passwordAction !== 'remove'
              ? <Lock size={14} className="text-pink-400" />
              : <Unlock size={14} className="text-gray-400" />
            }
            <span className="text-sm font-medium text-gray-700">保護密碼</span>
            {hasPassword && passwordAction === 'keep' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1">已設定</span>
            )}
          </div>

          {hasPassword && passwordAction === 'keep' && (
            <div className="flex gap-2">
              <button
                onClick={() => setPasswordAction('set')}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors touch-manipulation"
              >
                更改密碼
              </button>
              <button
                onClick={() => setPasswordAction('remove')}
                className="flex-1 py-2 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors touch-manipulation"
              >
                移除保護
              </button>
            </div>
          )}

          {passwordAction === 'remove' && (
            <div className="p-3 bg-red-50 rounded-xl space-y-2">
              <p className="text-sm text-red-600">確定要移除密碼保護嗎？儲存後任何人都可以查看此寶寶的資料。</p>
              <button
                onClick={() => setPasswordAction('keep')}
                className="w-full py-1.5 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-100 transition-colors touch-manipulation"
              >
                取消移除
              </button>
            </div>
          )}

          {(!hasPassword || passwordAction === 'set') && passwordAction !== 'remove' && (
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder={hasPassword ? '輸入新密碼（至少 4 個字元）' : '設定密碼保護（留空表示不保護）'}
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value)
                    if (!hasPassword) setPasswordAction(e.target.value ? 'set' : 'keep')
                  }}
                  className="form-input pr-10"
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {passwordAction === 'set'
                  ? '設定後，切換到此寶寶時需輸入密碼（本瀏覽器記住後免重複輸入）'
                  : '留空表示不設密碼保護'}
              </p>
              {hasPassword && passwordAction === 'set' && (
                <button
                  onClick={() => { setPasswordAction('keep'); setNewPassword('') }}
                  className="text-xs text-gray-400 underline touch-manipulation"
                >
                  取消更改
                </button>
              )}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full btn-primary py-3">
          {saving ? '儲存中...' : editBaby ? '更新資料' : '新增寶寶'}
        </button>
      </div>
    </Modal>
  )
}
