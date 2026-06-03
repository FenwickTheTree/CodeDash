import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'
import useStore from '../store/useStore'

const VERDICT_META = {
  OK:                      { label: 'Accepted',               cls: 'verdict-AC',      icon: CheckCircle },
  WRONG_ANSWER:            { label: 'Wrong Answer',           cls: 'verdict-WA',      icon: XCircle },
  TIME_LIMIT_EXCEEDED:     { label: 'Time Limit Exceeded',    cls: 'verdict-TLE',     icon: Clock },
  MEMORY_LIMIT_EXCEEDED:   { label: 'Memory Limit Exceeded',  cls: 'verdict-MLE',     icon: AlertTriangle },
  RUNTIME_ERROR:           { label: 'Runtime Error',          cls: 'verdict-RE',      icon: AlertTriangle },
  COMPILATION_ERROR:       { label: 'Compilation Error',      cls: 'verdict-CE',      icon: XCircle },
  TESTING:                 { label: 'Testing...',             cls: 'verdict-TESTING', icon: Loader2 },
  FAILED:                  { label: 'Failed',                 cls: 'verdict-CE',      icon: XCircle },
  REJECTED:                { label: 'Rejected',               cls: 'verdict-WA',      icon: XCircle }
}

const TERMINAL = new Set(['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR', 'COMPILATION_ERROR', 'FAILED', 'REJECTED', 'PARTIAL'])

export default function SubmissionStatus() {
  const { currentSubmission, submissionHistory, settings } = useStore()

  if (!currentSubmission && submissionHistory.length === 0) return null

  const toShow = currentSubmission
    ? [currentSubmission, ...submissionHistory.filter(s => s.id !== currentSubmission.id)]
    : submissionHistory

  return (
    <div className="flex flex-col gap-2">
      {toShow.slice(0, 5).map(sub => (
        <SubmissionRow key={sub.id} sub={sub} handle={settings.handle} />
      ))}
    </div>
  )
}

function SubmissionRow({ sub, handle }) {
  const isTerminal = TERMINAL.has(sub.verdict)
  const meta = VERDICT_META[sub.verdict] || VERDICT_META.TESTING
  const Icon = meta.icon

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${
      sub.verdict === 'OK' ? 'border-green-800 bg-green-900/20' :
      !isTerminal ? 'border-blue-800 bg-blue-900/20' :
      'border-border bg-bg-secondary'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold ${meta.cls}`}>
          <Icon size={11} className={!isTerminal ? 'animate-spin' : ''} />
          {meta.label}
        </span>

        {sub.passedTestCount != null && (
          <span className="text-gray-500">
            {isTerminal ? `Test ${sub.passedTestCount + 1}` : `${sub.passedTestCount} passed`}
          </span>
        )}

        {sub.timeConsumedMillis != null && (
          <span className="text-gray-500 font-mono">{sub.timeConsumedMillis}ms</span>
        )}

        {sub.memoryConsumedBytes != null && (
          <span className="text-gray-500 font-mono">
            {Math.round(sub.memoryConsumedBytes / 1024)}KB
          </span>
        )}

        {sub.id && (
          <button
            onClick={() => window.api.shell.openExternal(
              `https://codeforces.com/contest/${sub.problem?.contestId}/submission/${sub.id}`
            )}
            className="ml-auto text-gray-600 hover:text-gray-400"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {sub.programmingLanguage && (
        <div className="mt-1 text-gray-600">{sub.programmingLanguage}</div>
      )}
    </div>
  )
}
