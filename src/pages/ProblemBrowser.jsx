import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Users, Tag, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import ProblemFilter from '../components/ProblemFilter'
import useStore from '../store/useStore'

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
  3500: 'text-red-400'
}

function ratingColor(rating) {
  if (!rating) return 'text-gray-500'
  const bucket = Math.floor(rating / 100) * 100
  return RATING_COLORS[Math.min(bucket, 3500)] || 'text-red-400'
}

function verdictShort(v) {
  if (!v) return null
  const map = { OK: 'AC', WRONG_ANSWER: 'WA', TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE', RUNTIME_ERROR: 'RE', COMPILATION_ERROR: 'CE' }
  return map[v] || v.slice(0, 2)
}

export default function ProblemBrowser() {
  const navigate = useNavigate()
  const { problems, setProblems, setActiveProblem, setSampleTests, setTestResults } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentFilters, setCurrentFilters] = useState({ minRating: 800, maxRating: 3500, tags: [], sortBy: 'rating' })

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
        <h1 className="text-lg font-semibold text-white">Problems</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {loading ? 'Loading...' : `${problems.length} problems`}
        </p>
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

        {!loading && !error && problems.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            No problems match the current filters.
          </div>
        )}

        {!loading && problems.map(problem => (
          <div
            key={`${problem.contestId}_${problem.index}`}
            onClick={() => openProblem(problem)}
            className="flex items-center gap-4 px-5 py-3 border-b border-border/50 hover:bg-bg-tertiary cursor-pointer transition-colors group"
          >
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
        ))}
      </div>
    </div>
  )
}
