import { useNavigate } from 'react-router-dom'
import { Star, ChevronRight, ExternalLink } from 'lucide-react'
import useStore from '../store/useStore'

function ratingColor(rating) {
  if (!rating) return 'text-gray-500'
  if (rating < 1200) return 'text-gray-400'
  if (rating < 1400) return 'text-green-400'
  if (rating < 1600) return 'text-teal-400'
  if (rating < 1900) return 'text-blue-400'
  if (rating < 2100) return 'text-purple-400'
  if (rating < 2400) return 'text-yellow-400'
  if (rating < 2600) return 'text-orange-400'
  return 'text-red-400'
}

export default function Favorites() {
  const navigate = useNavigate()
  const { favorites, toggleFavorite, setActiveProblem, setSampleTests, setTestResults } = useStore()

  function openProblem(problem) {
    setActiveProblem(problem)
    setSampleTests([])
    setTestResults([])
    navigate(`/problem/${problem.contestId}/${problem.index}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Star size={18} className="text-yellow-400" />
          Favorites
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {favorites.length} starred problem{favorites.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 text-gray-500 gap-2">
            <Star size={28} className="text-gray-700" />
            <p className="text-sm">No favorites yet.</p>
            <p className="text-xs text-gray-600">Click the ☆ next to any problem to star it.</p>
          </div>
        )}

        {favorites.map(problem => (
          <div
            key={`${problem.contestId}_${problem.index}`}
            className="flex items-center gap-4 px-5 py-3 border-b border-border/50 hover:bg-bg-tertiary cursor-pointer transition-colors group"
            onClick={() => openProblem(problem)}
          >
            <button
              onClick={e => { e.stopPropagation(); toggleFavorite(problem) }}
              className="shrink-0 text-yellow-400 hover:text-yellow-300"
              title="Remove from favorites"
            >
              <Star size={16} fill="currentColor" />
            </button>

            <div className="w-20 shrink-0">
              <span className="text-xs font-mono text-gray-500">
                {problem.contestId}{problem.index}
              </span>
            </div>

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
                </div>
              )}
            </div>

            <div className={`w-12 text-right shrink-0 font-mono text-sm font-semibold ${ratingColor(problem.rating)}`}>
              {problem.rating || '?'}
            </div>

            <button
              onClick={e => {
                e.stopPropagation()
                window.api.shell.openExternal(
                  `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`
                )
              }}
              className="shrink-0 text-gray-600 hover:text-gray-400"
              title="Open on Codeforces"
            >
              <ExternalLink size={14} />
            </button>

            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
