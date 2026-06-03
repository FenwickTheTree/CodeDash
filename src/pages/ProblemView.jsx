import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, ExternalLink, RefreshCw, Loader2, Terminal,
  FileCode, ChevronDown, ChevronUp
} from 'lucide-react'
import TestCaseRunner from '../components/TestCaseRunner'
import SubmissionStatus from '../components/SubmissionStatus'
import useStore from '../store/useStore'

const CF_LANG_OPTIONS = [
  { value: 'cpp17',   label: 'C++17 (GCC 9.2)' },
  { value: 'cpp20',   label: 'C++20 (GCC 11)' },
  { value: 'java8',   label: 'Java 8' },
  { value: 'java17',  label: 'Java 17' },
  { value: 'python3', label: 'Python 3' },
  { value: 'pypy3',   label: 'PyPy 3' }
]

const LOCAL_LANG_MAP = {
  cpp17: 'cpp', cpp20: 'cpp',
  java8: 'java', java17: 'java',
  python3: 'python', pypy3: 'python'
}

export default function ProblemView() {
  const { contestId, index } = useParams()
  const navigate = useNavigate()
  const { activeProblem, settings, setCurrentSubmission, addSubmission, isLoggedIn } = useStore()

  const [selectedFile, setSelectedFile] = useState('')
  const [files, setFiles] = useState([])
  const [cfLanguage, setCfLanguage] = useState(settings.preferredLanguage || 'cpp17')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true)
  const [bottomTab, setBottomTab] = useState('tests') // tests | submit
  const webviewRef = useRef(null)

  const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`

  useEffect(() => {
    loadFiles()
  }, [settings.codeDirectory])

  async function loadFiles() {
    if (!settings.codeDirectory) return
    const f = await window.api.file.getFilesInDir(settings.codeDirectory)
    setFiles(f)
    if (f.length > 0) setSelectedFile(f[0].path)
  }

  async function handleSubmit() {
    if (!isLoggedIn) {
      alert('You must be logged in to submit. Click "Login to CF" in the sidebar.')
      return
    }

    let filePath = selectedFile
    if (!filePath) {
      // Let user pick
      filePath = await window.api.file.browseFile()
      if (!filePath) return
      setSelectedFile(filePath)
    }

    const code = await window.api.file.readFile(filePath)
    if (!code.trim()) {
      alert('The selected file is empty.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const pendingSub = {
      id: null,
      verdict: 'TESTING',
      problem: { contestId: Number(contestId), index },
      programmingLanguage: CF_LANG_OPTIONS.find(l => l.value === cfLanguage)?.label,
      submittedAt: Date.now()
    }
    setCurrentSubmission(pendingSub)
    setBottomTab('submit')
    setBottomPanelOpen(true)

    try {
      const result = await window.api.cf.submit({
        contestId: Number(contestId),
        problemIndex: index,
        languageId: cfLanguage,
        code,
        handle: settings.handle
      })

      if (result.submissionId) {
        const sub = { ...pendingSub, id: result.submissionId }
        setCurrentSubmission(sub)
        addSubmission(sub)
      }
    } catch (err) {
      setSubmitError(err.message === 'NOT_LOGGED_IN'
        ? 'Not logged in to Codeforces. Use "Login to CF" in the sidebar.'
        : err.message)
      setCurrentSubmission(null)
    } finally {
      setSubmitting(false)
    }
  }

  function reloadWebview() {
    if (webviewRef.current) {
      webviewRef.current.reload()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary shrink-0">
        <button
          onClick={() => navigate('/problems')}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">
            {contestId}{index}
            {activeProblem && ` — ${activeProblem.name}`}
          </h1>
          {activeProblem?.rating && (
            <span className="text-xs text-gray-500">Rating: {activeProblem.rating}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadWebview}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            title="Reload problem"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => window.api.shell.openExternal(problemUrl)}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            title="Open in browser"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Main layout: webview + bottom panel */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Webview */}
        <div className="flex-1 min-h-0 relative">
          <webview
            ref={webviewRef}
            src={problemUrl}
            className="absolute inset-0 w-full h-full"
            allowpopups="true"
          />
        </div>

        {/* Bottom panel toggle */}
        <div
          className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-t border-border cursor-pointer hover:bg-bg-tertiary transition-colors shrink-0"
          onClick={() => setBottomPanelOpen(p => !p)}
        >
          <div className="flex gap-3">
            <button
              onClick={e => { e.stopPropagation(); setBottomTab('tests'); setBottomPanelOpen(true) }}
              className={`flex items-center gap-1.5 text-xs ${bottomTab === 'tests' && bottomPanelOpen ? 'text-white' : 'text-gray-500'}`}
            >
              <Terminal size={13} />
              Test Runner
            </button>
            <button
              onClick={e => { e.stopPropagation(); setBottomTab('submit'); setBottomPanelOpen(true) }}
              className={`flex items-center gap-1.5 text-xs ${bottomTab === 'submit' && bottomPanelOpen ? 'text-white' : 'text-gray-500'}`}
            >
              <Send size={13} />
              Submit
            </button>
          </div>
          <div className="ml-auto text-gray-600">
            {bottomPanelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {/* Bottom panel content */}
        {bottomPanelOpen && (
          <div className="h-72 overflow-y-auto border-t border-border bg-bg-primary px-4 py-3 shrink-0">
            {bottomTab === 'tests' && (
              <TestCaseRunner contestId={Number(contestId)} problemIndex={index} />
            )}

            {bottomTab === 'submit' && (
              <div className="flex flex-col gap-4">
                {/* File + language picker */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-400">Code file:</span>
                    {files.length > 0 ? (
                      <select
                        value={selectedFile}
                        onChange={e => setSelectedFile(e.target.value)}
                        className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-gray-300"
                      >
                        <option value="">— select —</option>
                        {files.map(f => (
                          <option key={f.path} value={f.path}>{f.name}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => window.api.file.browseFile().then(p => p && setSelectedFile(p))}
                        className="px-3 py-1 bg-bg-tertiary border border-border rounded text-xs text-gray-300 hover:bg-gray-700"
                      >
                        Browse...
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Language:</span>
                    <select
                      value={cfLanguage}
                      onChange={e => setCfLanguage(e.target.value)}
                      className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-gray-300"
                    >
                      {CF_LANG_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-1.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 rounded text-xs text-white transition-colors ml-auto"
                  >
                    {submitting ? (
                      <><Loader2 size={13} className="animate-spin" /> Submitting...</>
                    ) : (
                      <><Send size={13} /> Submit to CF</>
                    )}
                  </button>
                </div>

                {submitError && (
                  <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
                    {submitError}
                  </div>
                )}

                {selectedFile && (
                  <div className="text-xs text-gray-600 font-mono truncate">
                    📁 {selectedFile}
                  </div>
                )}

                <SubmissionStatus />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
