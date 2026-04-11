import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { githubService, formatDate, createEmptyDay, generateId } from '../services/github'
import { settings as settingsStore, ls } from '../services/localStorage'
import toast from 'react-hot-toast'

const AppContext = createContext(null)

const initialState = {
  // Settings
  github: { token: '', owner: '', repo: '' },
  isGitHubConfigured: false,

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
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload }
    case 'SET_GITHUB':
      return { ...state, github: action.payload, isGitHubConfigured: !!(action.payload.token && action.payload.owner && action.payload.repo) }
    case 'SET_BABIES':
      return { ...state, babies: action.payload }
    case 'SET_ACTIVE_BABY':
      return { ...state, activeBabyId: action.payload }
    case 'SET_TODAY':
      return { ...state, today: action.payload }
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload }
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
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load settings on mount
  useEffect(() => {
    const saved = settingsStore.get()
    const github = saved.github || { token: '', owner: '', repo: '' }
    const babies = saved.babies || []
    const activeBabyId = saved.activeBabyId || (babies[0]?.id ?? null)

    dispatch({
      type: 'INIT',
      payload: {
        github,
        isGitHubConfigured: !!(github.token && github.owner && github.repo),
        babies,
        activeBabyId,
      }
    })

    if (github.token && github.owner && github.repo) {
      githubService.init(github)
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
    dispatch({ type: 'SET_ACTIVE_BABY', payload: babyId })
    settingsStore.update({ activeBabyId: babyId })
  }, [])

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

  const updateGitHub = useCallback(async (config) => {
    dispatch({ type: 'SET_GITHUB', payload: config })
    settingsStore.update({ github: config })
    githubService.init(config)

    try {
      await githubService.verifyAccess()
      toast.success('GitHub 連線成功！')
      return true
    } catch (e) {
      toast.error(`GitHub 連線失敗：${e.message}`)
      return false
    }
  }, [])

  const setSelectedDate = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date })
  }, [])

  const value = {
    ...state,
    activeBaby: state.babies.find(b => b.id === state.activeBabyId) || null,
    addRecord,
    updateRecord,
    deleteRecord,
    setActiveBaby,
    saveBaby,
    updateGitHub,
    setSelectedDate,
    loadDayRecord,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
