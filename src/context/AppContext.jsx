import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { githubService, formatDate, createEmptyDay, generateId } from '../services/github'
import { settings as settingsStore, ls, unlockedProfiles } from '../services/localStorage'
import toast from 'react-hot-toast'

const AppContext = createContext(null)

const initialState = {
  // Settings (token intentionally excluded — never stored in React state)
  github: { owner: '', repo: '' },
  isGitHubConfigured: false,
  autoConfigured: false, // true = injected from build-time secret

  // Feature toggles
  enableDiary: false,

  // Babies
  babies: [],
  activeBabyId: null,

  // Today's record
  today: null,
  selectedDate: formatDate(),

  // Loading states
  loading: false,
  syncing: false,

  // Offline queue
  offlineQueue: [],

  // Profile lock
  pendingUnlockBabyId: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload }
    case 'SET_GITHUB':
      return { ...state, github: { owner: action.payload.owner, repo: action.payload.repo }, isGitHubConfigured: !!(action.payload.owner && action.payload.repo && githubService.isConfigured) }
    case 'SET_BABIES':
      return { ...state, babies: action.payload }
    case 'SET_ACTIVE_BABY':
      return { ...state, activeBabyId: action.payload }
    case 'SET_TODAY':
      return { ...state, today: action.payload }
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload }
    case 'SET_ENABLE_DIARY':
      return { ...state, enableDiary: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload }
    case 'ADD_RECORD': {
      const { type, record } = action.payload
      const today = state.today ? { ...state.today } : createEmptyDay(state.selectedDate, state.activeBabyId)
      today[type] = [...(today[type] || []), record].sort((a, b) => (a.time || a.start || '').localeCompare(b.time || b.start || ''))
      return { ...state, today }
    }
    case 'UPDATE_RECORD': {
      const { type, record } = action.payload
      const today = { ...state.today }
      today[type] = today[type].map(r => r.id === record.id ? record : r)
      return { ...state, today }
    }
    case 'DELETE_RECORD': {
      const { type, id } = action.payload
      const today = { ...state.today }
      today[type] = today[type].filter(r => r.id !== id)
      return { ...state, today }
    }
    case 'UPDATE_TODAY':
      return { ...state, today: action.payload }
    case 'SET_PENDING_UNLOCK':
      return { ...state, pendingUnlockBabyId: action.payload }
    default:
      return state
  }
}

// Non-secret build-time config (owner/repo only — token NEVER injected at build time)
// Token is entered manually in Settings and stored only in localStorage on user's device
const ENV_OWNER = import.meta.env.VITE_GH_OWNER || ''
const ENV_REPO  = import.meta.env.VITE_GH_REPO  || ''

// Valid avatar list (must match Settings.jsx AVATARS)
const VALID_AVATARS = ['👶', '🧒', '👦', '👧', '🐣', '🌸', '⭐', '🌈']

/**
 * Repair a baby object whose avatar was garbled by Latin-1/UTF-8 confusion.
 * Garbling happens when atob() decoded a properly-encoded UTF-8 base64 without
 * the encodeURIComponent/escape step, producing Latin-1 bytes instead of Unicode.
 * We reverse it by reinterpreting each char code as a raw byte and decoding as UTF-8.
 * Returns the same object reference if no repair is needed.
 */
function repairBaby(baby) {
  let { avatar } = baby
  // Garbled avatars contain only chars ≤ 0xFF (Latin-1 byte range)
  if (avatar && [...avatar].every(c => c.charCodeAt(0) <= 0xFF)) {
    try {
      const bytes = new Uint8Array([...avatar].map(c => c.charCodeAt(0)))
      const recovered = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (VALID_AVATARS.includes(recovered)) avatar = recovered
    } catch {}
  }
  if (!VALID_AVATARS.includes(avatar)) avatar = '👶'
  return avatar === baby.avatar ? baby : { ...baby, avatar }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load settings on mount
  useEffect(() => {
    const saved = settingsStore.get()

    // Token ONLY from localStorage (manual input in Settings — never from build env, never in React state)
    // Owner/repo can be pre-filled from build-time env (not sensitive)
    const token = saved.github?.token || ''
    const github = {
      owner: ENV_OWNER || saved.github?.owner || '',
      repo:  ENV_REPO  || saved.github?.repo  || '',
    }

    const babies = (saved.babies || []).map(repairBaby)
    const activeBabyId = saved.activeBabyId || (babies[0]?.id ?? null)

    if (token && github.owner && github.repo) {
      githubService.init({ token, ...github })
    }

    const activeBabyObj = babies.find(b => b.id === activeBabyId)
    const needsUnlock = activeBabyObj?.passwordHash && !unlockedProfiles.has(activeBabyId)

    dispatch({
      type: 'INIT',
      payload: {
        github,
        isGitHubConfigured: !!(token && github.owner && github.repo),
        enableDiary: saved.enableDiary || false,
        babies,
        activeBabyId,
        autoConfigured: false,
        pendingUnlockBabyId: needsUnlock ? activeBabyId : null,
      }
    })

    if (token && github.owner && github.repo) {
      // Sync babies from GitHub on startup so other devices see up-to-date list
      githubService.getBabies().then(remoteBabies => {
        if (remoteBabies.length === 0) return
        // Repair any garbled avatars and write corrected data back to GitHub
        const repairedRemote = remoteBabies.map(repairBaby)
        repairedRemote.forEach((repaired, i) => {
          if (repaired !== remoteBabies[i]) {
            githubService.saveBaby(repaired).catch(() => {})
          }
        })
        const localBabies = saved.babies || []
        const localActiveId = saved.activeBabyId || (localBabies[0]?.id ?? null)
        const map = new Map(localBabies.map(b => [b.id, b]))
        repairedRemote.forEach(b => map.set(b.id, b))
        const merged = Array.from(map.values())
        dispatch({ type: 'SET_BABIES', payload: merged })
        settingsStore.update({ babies: merged })
        if (!localActiveId && merged.length > 0) {
          dispatch({ type: 'SET_ACTIVE_BABY', payload: merged[0].id })
          settingsStore.update({ activeBabyId: merged[0].id })
        }
      }).catch(() => {})
    }
  }, [])

  // Load today's record when baby or date changes
  useEffect(() => {
    if (state.activeBabyId) {
      loadDayRecord(state.activeBabyId, state.selectedDate)
    }
  }, [state.activeBabyId, state.selectedDate])

  const loadDayRecord = useCallback(async (babyId, date) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      if (state.isGitHubConfigured || githubService.isConfigured) {
        const record = await githubService.getDayRecord(babyId, date)
        dispatch({ type: 'SET_TODAY', payload: record })
      } else {
        // Use localStorage
        const key = `day_${babyId}_${date}`
        const record = ls.get(key) || createEmptyDay(date, babyId)
        dispatch({ type: 'SET_TODAY', payload: record })
      }
    } catch (e) {
      console.error('Failed to load day record:', e)
      dispatch({ type: 'SET_TODAY', payload: createEmptyDay(date, babyId) })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.isGitHubConfigured])

  const saveRecord = useCallback(async (updatedDay) => {
    if (!state.activeBabyId) return
    dispatch({ type: 'UPDATE_TODAY', payload: updatedDay })
    dispatch({ type: 'SET_SYNCING', payload: true })

    try {
      if (githubService.isConfigured) {
        await githubService.saveDayRecord(state.activeBabyId, state.selectedDate, updatedDay)
      } else {
        ls.set(`day_${state.activeBabyId}_${state.selectedDate}`, updatedDay)
      }
    } catch (e) {
      console.error('Save failed:', e)
      toast.error('儲存失敗，請稍後重試')
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [state.activeBabyId, state.selectedDate])

  const addRecord = useCallback(async (type, recordData) => {
    const record = { id: generateId(), ...recordData }
    const today = state.today || createEmptyDay(state.selectedDate, state.activeBabyId)
    const updatedDay = {
      ...today,
      [type]: [...(today[type] || []), record].sort((a, b) =>
        (a.time || a.start || '').localeCompare(b.time || b.start || '')
      )
    }
    await saveRecord(updatedDay)
    return record
  }, [state.today, state.selectedDate, state.activeBabyId, saveRecord])

  const updateRecord = useCallback(async (type, record) => {
    const today = { ...state.today }
    today[type] = today[type].map(r => r.id === record.id ? record : r)
    await saveRecord(today)
  }, [state.today, saveRecord])

  const deleteRecord = useCallback(async (type, id) => {
    const today = { ...state.today }
    today[type] = today[type].filter(r => r.id !== id)
    await saveRecord(today)
    toast.success('已刪除')
  }, [state.today, saveRecord])

  const setActiveBaby = useCallback((babyId) => {
    const baby = state.babies.find(b => b.id === babyId)
    if (baby?.passwordHash && !unlockedProfiles.has(babyId)) {
      dispatch({ type: 'SET_PENDING_UNLOCK', payload: babyId })
      return
    }
    dispatch({ type: 'SET_ACTIVE_BABY', payload: babyId })
    settingsStore.update({ activeBabyId: babyId })
  }, [state.babies])

  const unlockBaby = useCallback((babyId) => {
    unlockedProfiles.add(babyId)
    dispatch({ type: 'SET_ACTIVE_BABY', payload: babyId })
    dispatch({ type: 'SET_PENDING_UNLOCK', payload: null })
    settingsStore.update({ activeBabyId: babyId })
  }, [])

  const cancelUnlock = useCallback(() => {
    dispatch({ type: 'SET_PENDING_UNLOCK', payload: null })
  }, [])

  const deleteBaby = useCallback(async (babyId) => {
    const updatedBabies = state.babies.filter(b => b.id !== babyId)
    dispatch({ type: 'SET_BABIES', payload: updatedBabies })
    settingsStore.update({ babies: updatedBabies })
    if (state.activeBabyId === babyId) {
      const nextId = updatedBabies[0]?.id ?? null
      dispatch({ type: 'SET_ACTIVE_BABY', payload: nextId })
      settingsStore.update({ activeBabyId: nextId })
    }
    if (githubService.isConfigured) {
      try { await githubService.deleteBaby(babyId) } catch (e) {
        console.error('Failed to delete baby from GitHub:', e)
      }
    }
  }, [state.babies, state.activeBabyId])

  const saveBaby = useCallback(async (baby) => {
    const existing = state.babies.find(b => b.id === baby.id)
    const updatedBabies = existing
      ? state.babies.map(b => b.id === baby.id ? baby : b)
      : [...state.babies, baby]

    dispatch({ type: 'SET_BABIES', payload: updatedBabies })
    settingsStore.update({ babies: updatedBabies })

    if (githubService.isConfigured) {
      try {
        await githubService.saveBaby(baby)
      } catch (e) {
        console.error('Failed to save baby to GitHub:', e)
      }
    }

    return baby
  }, [state.babies])

  const syncBabiesFromGitHub = useCallback(async (localBabies, localActiveBabyId) => {
    try {
      const remoteBabies = await githubService.getBabies()
      if (remoteBabies.length === 0) return false
      const repairedRemote = remoteBabies.map(repairBaby)
      repairedRemote.forEach((repaired, i) => {
        if (repaired !== remoteBabies[i]) {
          githubService.saveBaby(repaired).catch(() => {})
        }
      })
      const map = new Map(localBabies.map(b => [b.id, b]))
      repairedRemote.forEach(b => map.set(b.id, b)) // remote overrides local
      const merged = Array.from(map.values())
      dispatch({ type: 'SET_BABIES', payload: merged })
      settingsStore.update({ babies: merged })
      if (!localActiveBabyId && merged.length > 0) {
        dispatch({ type: 'SET_ACTIVE_BABY', payload: merged[0].id })
        settingsStore.update({ activeBabyId: merged[0].id })
      }
      return remoteBabies.length
    } catch {
      return false
    }
  }, [])

  const updateGitHub = useCallback(async (config) => {
    // token must not be stored in React state — only passed to githubService and settingsStore
    const { token, owner, repo } = config
    githubService.init({ token, owner, repo })
    settingsStore.update({ github: { token, owner, repo } })
    dispatch({ type: 'SET_GITHUB', payload: { owner, repo } })

    try {
      await githubService.verifyAccess()
      const synced = await syncBabiesFromGitHub(state.babies, state.activeBabyId)
      if (synced) {
        toast.success(`GitHub 連線成功，已同步 ${synced} 位寶寶 👶`)
      } else {
        toast.success('GitHub 連線成功！')
      }
      return true
    } catch (e) {
      toast.error(`GitHub 連線失敗：${e.message}`)
      return false
    }
  }, [state.babies, state.activeBabyId, syncBabiesFromGitHub])

  const setSelectedDate = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date })
  }, [])

  const setEnableDiary = useCallback((enabled) => {
    dispatch({ type: 'SET_ENABLE_DIARY', payload: enabled })
    settingsStore.update({ enableDiary: enabled })
  }, [])

  const value = {
    ...state,
    activeBaby: state.babies.find(b => b.id === state.activeBabyId) || null,
    addRecord,
    updateRecord,
    deleteRecord,
    setActiveBaby,
    unlockBaby,
    cancelUnlock,
    saveBaby,
    deleteBaby,
    updateGitHub,
    setSelectedDate,
    setEnableDiary,
    loadDayRecord,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
