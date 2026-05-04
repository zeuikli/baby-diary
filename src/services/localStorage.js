/**
 * LocalStorage fallback service
 * Used when GitHub is not configured or for offline caching
 */

const PREFIX = 'baby_diary_'

export const ls = {
  get(key, defaultVal = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? JSON.parse(raw) : defaultVal
    } catch {
      return defaultVal
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (e) {
      console.warn('localStorage write failed:', e)
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key)
  },

  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.slice(PREFIX.length))
  }
}

// Settings storage
export const settings = {
  get() {
    return ls.get('settings', {
      github: { token: '', owner: '', repo: '' },
      babies: [],
      activeBabyId: null,
    })
  },

  set(data) {
    ls.set('settings', data)
  },

  update(partial) {
    const current = this.get()
    const updated = deepMerge(current, partial)
    this.set(updated)
    return updated
  }
}

export const unlockedProfiles = {
  get() { return ls.get('unlocked_profiles', []) },
  add(babyId, passwordHash) {
    const list = this.get().filter(e => (typeof e === 'object' ? e.id : e) !== babyId)
    ls.set('unlocked_profiles', [...list, { id: babyId, hash: passwordHash || '' }])
  },
  // Returns true only when the stored hash matches the current passwordHash.
  // Old string-format entries (pre-migration) are always treated as invalid.
  has(babyId, passwordHash) {
    return this.get().some(e => typeof e === 'object' && e.id === babyId && e.hash === (passwordHash || ''))
  },
  remove(babyId) {
    ls.set('unlocked_profiles', this.get().filter(e => (typeof e === 'object' ? e.id : e) !== babyId))
  },
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}
