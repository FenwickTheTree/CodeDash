import { useState } from 'react'
import { Play, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

const VERDICT_META = {
  AC:  { label: 'Accepted',             icon: CheckCircle,    cls: 'verdict-AC' },
  WA:  { label: 'Wrong Answer',         icon: XCircle,        cls: 'verdict-WA' },
  TLE: { label: 'Time Limit Exceeded',  icon: Clock,          cls: 'verdict-TLE' },
  MLE: { label: 'Memory Limit Exceeded',icon: AlertTriangle,  cls: 'verdict-MLE' },
  RE:  { label: 'Runtime Error',        icon: AlertTriangle,  cls: 'verdict-RE' },
  CE:  { label: 'Compilation Error',    icon: XCircle,        cls: 'verdict-CE' }
}

function VerdictBadge({ verdict }) {
  const meta = VERDICT_META[verdict] || { label: verdict, icon: AlertTriangle, cls: 'verdict-CE' }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${meta.cls}`}>
      <Icon size={11} />
      {verdict}
    </span>
  )
}

function TestCase({ result, index, expanded, onToggle }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary transition-colors text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        <span className="text-sm text-gray-300">Test {index + 1}</span>
        {result && <VerdictBadge verdict={result.verdict} />}
        {result?.time != null && (
          <span className="ml-auto text-xs text-gray-600 font-mono">{result.time}ms</span>
        )}
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-bg-primary text-xs font-mono">
          <div>
            <div className="text-gray-500 mb-1 uppercase text-[10px] tracking-wider">Input</div>
            <pre className="text-gray-300 whitespace-pre-wrap bg-bg-secondary rounded p-2 overflow-auto max-h-32">
              {result?.input || ''}
            </pre>
          </div>
          <div>
            <div className="text-gray-500 mb-1 uppercase text-[10px] tracking-wider">Expected</div>
            <pre className="text-gray-300 whitespace-pre-wrap bg-bg-secondary rounded p-2 overflow-auto max-h-32">
              {result?.expected || ''}
            </pre>
          </div>
          {result?.actual !== undefined && (
            <div className="col-span-2">
              <div className={`mb-1 uppercase text-[10px] tracking-wider ${
                result.verdict === 'AC' ? 'text-green-500' : 'text-red-500'
              }`}>
                Your Output {result.verdict === 'AC' ? '✓' : '✗'}
              </div>
              <pre className={`whitespace-pre-wrap rounded p-2 overflow-auto max-h-32 ${
                result.verdict === 'AC'
                  ? 'text-green-300 bg-green-900/20'
                  : 'text-red-300 bg-red-900/20'
              }`}>
                {result.actual || '(empty)'}
              </pre>
            </div>
          )}
          {result?.error && (
            <div className="col-span-2">
              <div className="text-yellow-500 mb-1 uppercase text-[10px] tracking-wider">Error</div>
              <pre className="text-yellow-300 bg-yellow-900/20 whitespace-pre-wrap rounded p-2 overflow-auto max-h-24">
                {result.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TestCaseRunner({ contestId, problemIndex }) {
  const { sampleTests, setSampleTests, testResults, setTestResults, isRunningTests, setRunningTests, settings } = useStore()
  const [loadingTests, setLoadingTests] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [selectedFile, setSelectedFile] = useState('')
  const [files, setFiles] = useState([])
  const [compilerPath, setCompilerPath] = useState('')
  const [language, setLanguage] = useState('cpp')
  const [loadError, setLoadError] = useState(null)

  async function loadSampleTests() {
    setLoadingTests(true)
    setLoadError(null)
    try {
      const tests = await window.api.cf.getSampleTests(contestId, problemIndex)
      setSampleTests(tests)
      // Expand all by default
      const exp = {}
      tests.forEach((_, i) => { exp[i] = true })
      setExpanded(exp)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoadingTests(false)
    }
  }

  async function refreshFiles() {
    if (!settings.codeDirectory) return
    const f = await window.api.file.getFilesInDir(settings.codeDirectory)
    setFiles(f)
    if (f.length > 0 && !selectedFile) {
      setSelectedFile(f[0].path)
      setLanguage(f[0].ext === 'cpp' ? 'cpp' : f[0].ext === 'java' ? 'java' : 'python')
    }
  }

  async function runTests() {
    if (!selectedFile) {
      alert('Select a code file first')
      return
    }
    if (sampleTests.length === 0) {
      alert('Load sample tests first')
      return
    }

    setRunningTests(true)
    setTestResults([])
    try {
      const results = await window.api.file.runTests({
        filePath: selectedFile,
        language,
        compilerPath: compilerPath || getDefaultCompiler(language),
        tests: sampleTests
      })
      setTestResults(results)
      const exp = {}
      results.forEach((_, i) => { exp[i] = true })
      setExpanded(exp)
    } catch (err) {
      alert('Run failed: ' + err.message)
    } finally {
      setRunningTests(false)
    }
  }

  function getDefaultCompiler(lang) {
    if (lang === 'cpp') return settings.cppCompiler || '/usr/bin/g++'
    if (lang === 'java') return settings.javaCompiler || 'javac'
    return settings.pythonInterpreter || '/usr/bin/python3'
  }

  function onFileChange(e) {
    const path = e.target.value
    setSelectedFile(path)
    const f = files.find(f => f.path === path)
    if (f) {
      setLanguage(f.ext === 'cpp' ? 'cpp' : f.ext === 'java' ? 'java' : 'python')
    }
  }

  const allAC = testResults.length > 0 && testResults.every(r => r.verdict === 'AC')
  const hasFailure = testResults.some(r => r.verdict !== 'AC')
  const displayTests = testResults.length > 0 ? testResults : sampleTests.map(t => ({ ...t, verdict: null }))

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={loadSampleTests}
          disabled={loadingTests}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-gray-700 border border-border rounded text-xs text-gray-300 transition-colors disabled:opacity-50"
        >
          {loadingTests ? <Loader2 size={12} className="animate-spin" /> : null}
          {sampleTests.length > 0 ? `${sampleTests.length} tests loaded` : 'Load Sample Tests'}
        </button>

        {sampleTests.length > 0 && (
          <>
            <button
              onClick={refreshFiles}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-gray-700 border border-border rounded text-xs text-gray-300 transition-colors"
            >
              Refresh Files
            </button>

            {files.length > 0 ? (
              <select
                value={selectedFile}
                onChange={onFileChange}
                className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-gray-300"
              >
                <option value="">— select file —</option>
                {files.map(f => (
                  <option key={f.path} value={f.path}>{f.name}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => window.api.file.browseFile().then(p => p && setSelectedFile(p))}
                className="px-3 py-1.5 bg-bg-tertiary hover:bg-gray-700 border border-border rounded text-xs text-gray-300 transition-colors"
              >
                Browse file...
              </button>
            )}

            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-gray-300"
            >
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
            </select>

            <input
              type="text"
              placeholder={`Compiler path (default: ${getDefaultCompiler(language)})`}
              value={compilerPath}
              onChange={e => setCompilerPath(e.target.value)}
              className="flex-1 min-w-0 bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600"
            />

            <button
              onClick={runTests}
              disabled={isRunningTests || !selectedFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green hover:bg-green-600 disabled:opacity-50 rounded text-xs text-white transition-colors"
            >
              {isRunningTests ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run Tests
            </button>
          </>
        )}

        {allAC && (
          <span className="text-xs text-green-400 font-semibold">✓ All tests passed!</span>
        )}
        {hasFailure && (
          <span className="text-xs text-red-400 font-semibold">
            {testResults.filter(r => r.verdict !== 'AC').length} test(s) failed
          </span>
        )}
      </div>

      {loadError && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
          {loadError}
        </div>
      )}

      {/* Test cases */}
      <div className="flex flex-col gap-2">
        {displayTests.map((test, i) => (
          <TestCase
            key={i}
            index={i}
            result={testResults[i] || (sampleTests[i] ? { input: sampleTests[i].input, expected: sampleTests[i].output } : null)}
            expanded={!!expanded[i]}
            onToggle={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
          />
        ))}
      </div>
    </div>
  )
}
