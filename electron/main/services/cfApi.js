import crypto from 'crypto'
import { createRequire } from 'module'

// axios doesn't survive Electron 31's ESM CJS-interop pre-parse — use createRequire
const _require = createRequire(import.meta.url)
const axios = _require('axios')

const BASE = 'https://codeforces.com/api'

function buildSig(method, params, apiKey, apiSecret) {
  const time = Math.floor(Date.now() / 1000)
  const rand = crypto.randomBytes(3).toString('hex')
  const allParams = { ...params, apiKey, time: String(time) }
  const sorted = Object.keys(allParams).sort().map(k => `${k}=${allParams[k]}`).join('&')
  const toHash = `${rand}/${method}?${sorted}#${apiSecret}`
  const hash = crypto.createHash('sha512').update(toHash).digest('hex')
  return { apiSig: `${rand}${hash}`, time, ...allParams }
}

async function apiGet(method, params = {}, auth = null) {
  let finalParams = { ...params }
  if (auth && auth.apiKey && auth.apiSecret) {
    finalParams = buildSig(method, params, auth.apiKey, auth.apiSecret)
  }
  const res = await axios.get(`${BASE}/${method}`, { params: finalParams, timeout: 15000 })
  if (res.data.status !== 'OK') throw new Error(res.data.comment || 'CF API error')
  return res.data.result
}

// In-memory problem cache
let problemsCache = null
let cacheTime = 0

export async function getProblems(filters = {}) {
  const now = Date.now()
  if (!problemsCache || now - cacheTime > 30 * 60 * 1000) {
    const result = await apiGet('problemset.problems')
    problemsCache = result
    cacheTime = now
  }

  let { problems, problemStatistics } = problemsCache

  const solveMap = {}
  problemStatistics.forEach(s => { solveMap[`${s.contestId}_${s.index}`] = s.solvedCount })
  problems = problems.map(p => ({
    ...p,
    solvedCount: solveMap[`${p.contestId}_${p.index}`] || 0
  }))

  if (filters.minRating) problems = problems.filter(p => p.rating >= filters.minRating)
  if (filters.maxRating) problems = problems.filter(p => p.rating <= filters.maxRating)
  if (filters.tags && filters.tags.length > 0) {
    problems = problems.filter(p => filters.tags.every(tag => p.tags && p.tags.includes(tag)))
  }

  if (filters.sortBy === 'rating') {
    problems.sort((a, b) => (a.rating || 0) - (b.rating || 0))
  } else if (filters.sortBy === 'rating_desc') {
    problems.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (filters.sortBy === 'solved') {
    problems.sort((a, b) => b.solvedCount - a.solvedCount)
  }

  const random = filters.random ? (problems[Math.floor(Math.random() * problems.length)] || null) : undefined

  // Return the full filtered set (the UI handles search + display limits).
  return { problems, ...(random !== undefined && { random }) }
}

export async function getUserInfo(handle) {
  const result = await apiGet('user.info', { handles: handle })
  return result[0]
}

export async function getUserStatus(handle, from = 1, count = 20) {
  return apiGet('user.status', { handle, from, count })
}

export async function getSubmissionStatus(submissionId, handle) {
  const submissions = await apiGet('user.status', { handle, from: 1, count: 20 })
  const sub = submissions.find(s => s.id === submissionId)
  if (!sub) return null
  return {
    id: sub.id,
    verdict: sub.verdict,
    passedTestCount: sub.passedTestCount,
    timeConsumedMillis: sub.timeConsumedMillis,
    memoryConsumedBytes: sub.memoryConsumedBytes,
    programmingLanguage: sub.programmingLanguage,
    problem: sub.problem,
    creationTimeSeconds: sub.creationTimeSeconds
  }
}
