/**
 * GitHub API Data Layer
 * Stores baby diary data as JSON files in a private GitHub repository
 */

const GITHUB_API = 'https://api.github.com'

class GitHubService {
  constructor() {
    this.token = null
    this.owner = null
    this.repo = null
    this._cache = new Map()
    this._pendingWrites = new Map()
    this._writeTimer = null
  }

  init({ token, owner, repo }) {
    this.token = token
    this.owner = owner
    this.repo = repo
    this._cache.clear()
  }

  get isConfigured() {
    return !!(this.token && this.owner && this.repo)
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  }

  async request(method, path, body = null) {
    const url = `${GITHUB_API}${path}`
    const opts = { method, headers: this.headers }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `GitHub API error: ${res.status}`)
    }
    return res.status === 204 ? null : res.json()
  }

  // ─── File Operations ───────────────────────────────────────

  async getFile(filePath) {
    const cacheKey = filePath
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)
    }

    try {
      const data = await this.request('GET', `/repos/${this.owner}/${this.repo}/contents/${filePath}`)
      const content = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))
      this._cache.set(cacheKey, { content, sha: data.sha })
      return { content, sha: data.sha }
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('Not Found')) {
        return null
      }
      throw e
    }
  }

  async deleteFile(filePath, message = 'Delete file') {
    const existing = await this.getFile(filePath)
    if (!existing?.sha) return // file doesn't exist, nothing to do
    await this.request('DELETE', `/repos/${this.owner}/${this.repo}/contents/${filePath}`, {
      message,
      sha: existing.sha,
    })
    this._cache.delete(filePath)
  }

  async putFile(filePath, content, message = 'Update diary data') {
    const existing = await this.getFile(filePath)
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    }
    if (existing?.sha) body.sha = existing.sha

    const result = await this.request('PUT', `/repos/${this.owner}/${this.repo}/contents/${filePath}`, body)
    this._cache.set(filePath, { content, sha: result.content.sha })
    return result
  }

  // Debounced write to reduce API calls
  scheduleWrite(filePath, content) {
    this._pendingWrites.set(filePath, content)
    if (this._writeTimer) clearTimeout(this._writeTimer)
    this._writeTimer = setTimeout(() => this.flushWrites(), 1500)
  }

  async flushWrites() {
    const writes = new Map(this._pendingWrites)
    this._pendingWrites.clear()
    for (const [path, content] of writes) {
      try {
        await this.putFile(path, content)
      } catch (e) {
        console.error('Write failed:', path, e)
      }
    }
  }

  // ─── Data Paths ────────────────────────────────────────────

  dayPath(date) {
    const d = typeof date === 'string' ? date : formatDate(date)
    const [year, month] = d.split('-')
    return `records/${year}-${month}/${d}.json`
  }

  babyPath(babyId) {
    return `babies/${babyId}.json`
  }

  // ─── Baby Management ───────────────────────────────────────

  async getBabies() {
    try {
      const data = await this.request('GET', `/repos/${this.owner}/${this.repo}/contents/babies`)
      const files = Array.isArray(data) ? data : []
      const babies = await Promise.all(
        files
          .filter(f => f.name.endsWith('.json'))
          .map(async f => {
            const result = await this.getFile(`babies/${f.name}`)
            return result?.content
          })
      )
      return babies.filter(Boolean)
    } catch {
      return []
    }
  }

  async saveBaby(baby) {
    const path = this.babyPath(baby.id)
    await this.putFile(path, baby, `Update baby profile: ${baby.name}`)
    return baby
  }

  async deleteBaby(babyId) {
    const path = this.babyPath(babyId)
    await this.deleteFile(path, `Delete baby profile: ${babyId}`)
  }

  // ─── Daily Records ─────────────────────────────────────────

  async getDayRecord(babyId, date) {
    const d = typeof date === 'string' ? date : formatDate(date)
    const path = `${babyId}/${this.dayPath(d)}`
    const result = await this.getFile(path)
    return result?.content || createEmptyDay(d, babyId)
  }

  async saveDayRecord(babyId, date, record) {
    const d = typeof date === 'string' ? date : formatDate(date)
    const path = `${babyId}/${this.dayPath(d)}`
    this._cache.set(path, { content: record, sha: this._cache.get(path)?.sha })
    this.scheduleWrite(path, record)
    return record
  }

  async saveDayRecordNow(babyId, date, record) {
    const d = typeof date === 'string' ? date : formatDate(date)
    const path = `${babyId}/${this.dayPath(d)}`
    await this.putFile(path, record, `Update records: ${d}`)
    return record
  }

  // ─── Range Query ───────────────────────────────────────────

  async getMonthRecords(babyId, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const dirPath = `${babyId}/records/${monthStr}`

    try {
      const files = await this.request('GET', `/repos/${this.owner}/${this.repo}/contents/${dirPath}`)
      if (!Array.isArray(files)) return []

      const records = await Promise.all(
        files
          .filter(f => f.name.endsWith('.json'))
          .map(async f => {
            const result = await this.getFile(`${dirPath}/${f.name}`)
            return result?.content
          })
      )
      return records.filter(Boolean)
    } catch {
      return []
    }
  }

  // ─── Growth Records ────────────────────────────────────────

  async getGrowthRecords(babyId) {
    const path = `${babyId}/growth.json`
    const result = await this.getFile(path)
    return result?.content || []
  }

  async addGrowthRecord(babyId, record) {
    const records = await this.getGrowthRecords(babyId)
    const existing = records.findIndex(r => r.date === record.date)
    if (existing >= 0) {
      records[existing] = record
    } else {
      records.push(record)
      records.sort((a, b) => a.date.localeCompare(b.date))
    }
    await this.putFile(`${babyId}/growth.json`, records, `Add growth record: ${record.date}`)
    return records
  }

  // ─── Diary ────────────────────────────────────────────────

  async getDiaryEntries(babyId, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const path = `${babyId}/diary/${monthStr}.json`
    const result = await this.getFile(path)
    return result?.content || []
  }

  async saveDiaryEntry(babyId, entry) {
    const date = entry.date
    const [year, month] = date.split('-')
    const monthStr = `${year}-${month}`
    const path = `${babyId}/diary/${monthStr}.json`

    const entries = await this.getDiaryEntries(babyId, year, parseInt(month))
    const idx = entries.findIndex(e => e.id === entry.id)
    if (idx >= 0) {
      entries[idx] = entry
    } else {
      entries.unshift(entry)
    }
    await this.putFile(path, entries, `Diary entry: ${date}`)
    return entries
  }

  // ─── Verify Access ─────────────────────────────────────────

  async verifyAccess() {
    const result = await this.request('GET', `/repos/${this.owner}/${this.repo}`)
    return result
  }

  // Initialize repo structure
  async initRepo() {
    try {
      await this.putFile('README.md', { _: 'Baby Diary Data' }, 'Initialize baby diary data repo')
    } catch {
      // Already exists
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────

export function formatDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function createEmptyDay(date, babyId) {
  return {
    date,
    babyId,
    feeding: [],
    sleep: [],
    diaper: [],
    pumping: [],
    solids: [],
    notes: [],
  }
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Singleton
export const githubService = new GitHubService()
