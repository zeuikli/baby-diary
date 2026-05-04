import React, { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { verifyPassword } from '../utils/crypto'
import toast from 'react-hot-toast'

export default function BabyUnlockModal() {
  const { babies, pendingUnlockBabyId, unlockBaby, cancelUnlock } = useApp()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(false)

  const baby = babies.find(b => b.id === pendingUnlockBabyId)

  useEffect(() => {
    if (pendingUnlockBabyId) {
      setPassword('')
      setShowPassword(false)
    }
  }, [pendingUnlockBabyId])

  if (!pendingUnlockBabyId || !baby) return null

  const handleUnlock = async () => {
    if (!password) { toast.error('請輸入密碼'); return }
    setChecking(true)
    try {
      const ok = await verifyPassword(password, baby.passwordHash)
      if (ok) {
        unlockBaby(baby.id, baby.passwordHash)
        toast.success(`已解鎖 ${baby.name} 的資料 🔓`)
      } else {
        toast.error('密碼錯誤，請再試一次')
        setPassword('')
      }
    } finally {
      setChecking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock()
    if (e.key === 'Escape') { cancelUnlock() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-bounce-in">
        <div className="text-center">
          <div className="text-4xl mb-2">{baby.avatar || '👶'}</div>
          <h2 className="text-lg font-bold text-gray-800">{baby.name}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <Lock size={13} className="text-gray-400" />
            <p className="text-sm text-gray-500">此寶寶已設定保護密碼</p>
          </div>
        </div>

        <div>
          <label className="form-label">輸入密碼</label>
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? 'text' : 'password'}
              placeholder="請輸入密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="form-input pr-10"
              autoComplete="off"
            />
            <button
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">驗證成功後，此瀏覽器將不再需要重複輸入</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={cancelUnlock}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors touch-manipulation"
          >
            取消
          </button>
          <button
            onClick={handleUnlock}
            disabled={checking}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {checking
              ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> 驗證中...</>
              : <><Lock size={14} /> 解鎖</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
