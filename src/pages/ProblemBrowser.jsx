import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Users, Tag, ChevronRight, Loader2, AlertCircle, Search, X } from 'lucide-react'
import ProblemFilter from '../components/ProblemFilter'
import useStore from '../store/useStore'

const DISPLAY_LIMIT = 300

const RATING_COLORS = {
  800: 'text-gray-400',
  900: 'text-gray-400',
  1000: 'text-gray-400',
  1100: 'text-gray-400',
  1200: 'text-green-400',
  1300: 'text-green-400',
  1400: 'text-teal-400',
  1500: 'text-teal-400',
  1600: 'text-blue-400',
  1700: 'text-blue-400',
  1800: 'text-blue-400',
  1900: 'text-purple-400',
  2000: 'text-yellow-400',
  2100: 'text-yellow-400',
  2200: 'text-yellow-400',
  2300: 'text-orange-400',
  2400: 'text-orange-400',
  2500: 'text-red-400',
  2600: 'text-red-400',
  2700: 'text-red-400',
  2800: 'text-red-400',
  2900: 'text-red-400',
  3000: 'text-red-400',
  3500: 'text-red-400',
  3600: 'text-red-400',
  3700: 'text-red-400',
  3800: 'text-red-400',
  3900: 'text-red-400',
  4000: 'text-red-400'
}

function ratingColor(rating) {
  if (!rating) return 'text-gray-500'
  const bucket = Math.floor(rating / 100) * 100
  return RATING_COLORS[Math.min(bucket, 4000)] || 'text-red-400'
}

function verdictShort(v) {
  if (!v) return null
  const map = { OK: 'AC', WRONG_ANSWER: 'WA', TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE', RUNTIME_ERROR: 'RE', COMPILATION_ERROR: 'CE' }
  return map[v] || v.slice(0, 2)
}

export default function ProblemBrowser() {
  const navigate = useNavigate()
  const { problems, setProblems, setActiveProblem, setSampleTests, setTestResults,
    favorites, toggleFavorite } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [currentFilters, setCurrentFilters] = useState({ minRating: 800, maxRating: 4000, tags: [], sortBy: 'rating' })

  const favKeys = useMemo(
    () => new Set(favorites.map(f => `${f.contestId}_${f.index}`)),
    [favorites]
  )

  // Client-side search: by name, or by problem code like "2118B" / "2118".
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return problems
    return problems.filter(p => {
      const code = `${p.contestId}${p.index}`.toLowerCase()
      return code.includes(q) || (p.name && p.name.toLowerCase().includes(q))
    })
  }, [problems, search])

  const shown = filtered.slice(0, DISPLAY_LIMIT)

  useEffect(() => {
    fetchProblems(currentFilters)
  }, [])

  async function fetchProblems(filters) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.cf.getProblems(filters)
      setProblems(result.problems || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFilter(filters) {
    setCurrentFilters(filters)
    fetchProblems(filters)
  }

  async function handleRandom(filters) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.cf.getProblems({ ...filters, random: true })
      if (result.random) {
        openProblem(result.random)
      }
      setProblems(result.problems || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openProblem(problem) {
    setActiveProblem(problem)
    setSampleTests([])
    setTestResults([])
    navigate(`/problem/${problem.contestId}/${problem.index}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Problems</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading
                ? 'Loading...'
                : search
                  ? `${filtered.length} of ${problems.length} problems`
                  : `${problems.length} problems`}
            </p>
          </div>

          <div className="ml-auto relative w-72">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code (e.g. 2118B)"
              className="w-full bg-bg-tertiary border border-border rounded pl-8 pr-7 py-1.5 text-sm text-white placeholder-gray-600"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ProblemFilter onFilter={handleFilter} onRandom={handleRandom} loading={loading} />

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Fetching problems...</span>
          </div>
        )}

        {error && (
          <div className="m-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            {search ? `No problems match "${search}".` : 'No problems match the current filters.'}
          </div>
        )}

        {!loading && shown.map(problem => {
          const isFav = favKeys.has(`${problem.contestId}_${problem.index}`)
          return (
          <div
            key={`${problem.contestId}_${problem.index}`}
            onClick={() => openProblem(problem)}
            className="flex items-center gap-4 px-5 py-3 border-b border-border/50 hover:bg-bg-tertiary cursor-pointer transition-colors group"
          >
            {/* Star */}
            <button
              onClick={e => { e.stopPropagation(); toggleFavorite(problem) }}
              className={`shrink-0 transition-colors ${
                isFav ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-yellow-400'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
            </button>

            {/* Contest + Index */}
            <div className="w-20 shrink-0">
              <span className="text-xs font-mono text-gray-500">
                {problem.contestId}{problem.index}
              </span>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-200 group-hover:text-white transition-colors truncate block">
                {problem.name}
              </span>
              {problem.tags && problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {problem.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-xs text-gray-600 bg-bg-primary px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                  {problem.tags.length > 4 && (
                    <span className="text-xs text-gray-700">+{problem.tags.length - 4}</span>
                  )}
                </div>
              )}
            </div>

            {/* Solved count */}
            <div className="flex items-center gap-1 shrink-0 w-24 text-right">
              <Users size={12} className="text-gray-600" />
              <span className="text-xs text-gray-500">
                {problem.solvedCount ? problem.solvedCount.toLocaleString() : '—'}
              </span>
            </div>

            {/* Rating */}
            <div className={`w-12 text-right shrink-0 font-mono text-sm font-semibold ${ratingColor(problem.rating)}`}>
              {problem.rating || '?'}
            </div>

            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
          </div>
        )})}

        {!loading && filtered.length > DISPLAY_LIMIT && (
          <div className="px-5 py-4 text-center text-xs text-gray-500">
            Showing first {DISPLAY_LIMIT} of {filtered.length} — refine the filters or search to narrow down.
          </div>
        )}
      </div>
    </div>
  )
}
