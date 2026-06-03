import { useState, useEffect } from 'react'
import { Shuffle, Search, X } from 'lucide-react'
import useStore from '../store/useStore'

const CF_TAGS = [
  '2-sat', 'binary search', 'bitmasks', 'brute force', 'chinese remainder theorem',
  'combinatorics', 'constructive algorithms', 'data structures', 'dfs and similar',
  'divide and conquer', 'dp', 'dsu', 'expression parsing', 'fft', 'flows',
  'games', 'geometry', 'graph matchings', 'graphs', 'greedy', 'hashing',
  'implementation', 'interactive', 'math', 'matrices', 'meet-in-the-middle',
  'number theory', 'probabilities', 'schedules', 'shortest paths', 'sortings',
  'string suffix structures', 'strings', 'ternary search', 'trees', 'two pointers'
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating ↑' },
  { value: 'rating_desc', label: 'Rating ↓' },
  { value: 'solved', label: 'Most Solved' }
]

export default function ProblemFilter({ onFilter, onRandom, loading }) {
  const [minRating, setMinRating] = useState(800)
  const [maxRating, setMaxRating] = useState(3500)
  const [selectedTags, setSelectedTags] = useState([])
  const [sortBy, setSortBy] = useState('rating')
  const [tagSearch, setTagSearch] = useState('')

  const filteredTags = CF_TAGS.filter(t => t.includes(tagSearch.toLowerCase()))

  function toggleTag(tag) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function applyFilter() {
    onFilter({ minRating, maxRating, tags: selectedTags, sortBy })
  }

  function handleRandom() {
    onRandom({ minRating, maxRating, tags: selectedTags })
  }

  function clearTags() {
    setSelectedTags([])
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-bg-secondary border-b border-border">
      {/* Rating range */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-20">Min Rating</label>
          <input
            type="number"
            value={minRating}
            min={800} max={3500} step={100}
            onChange={e => setMinRating(Number(e.target.value))}
            className="w-20 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-20">Max Rating</label>
          <input
            type="number"
            value={maxRating}
            min={800} max={3500} step={100}
            onChange={e => setMaxRating(Number(e.target.value))}
            className="w-20 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Sort by</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-white"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={applyFilter}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 rounded text-sm text-white transition-colors"
          >
            <Search size={14} />
            Filter
          </button>
          <button
            onClick={handleRandom}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-green hover:bg-green-600 disabled:opacity-50 rounded text-sm text-white transition-colors"
          >
            <Shuffle size={14} />
            Random
          </button>
        </div>
      </div>

      {/* Tag filter */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">Tags:</span>
          {selectedTags.length > 0 && (
            <button onClick={clearTags} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
              <X size={10} /> Clear all
            </button>
          )}
          <input
            type="text"
            placeholder="Search tags..."
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
            className="ml-auto w-36 bg-bg-tertiary border border-border rounded px-2 py-0.5 text-xs text-white placeholder-gray-600"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {filteredTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-tertiary text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
