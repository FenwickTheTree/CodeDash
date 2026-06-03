import { useState, useEffect } from 'react'
import { Save, FolderOpen, Info, Check } from 'lucide-react'
import useStore from '../store/useStore'

function Field({ label, description, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const { settings, setSettings } = useStore()
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    await window.api.settings.set(form)
    const updated = await window.api.settings.get()
    setSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function browseDir(key) {
    const dir = await window.api.file.browseDirectory()
    if (dir) set(key, dir)
  }

  async function browseFile(key) {
    const file = await window.api.file.browseFile()
    if (file) set(key, file)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your Codeforces account and local tools</p>
          </div>
          <button
            onClick={save}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-700 text-white'
                : 'bg-accent-blue hover:bg-blue-600 text-white'
            }`}
          >
            {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save</>}
          </button>
        </div>

        {/* Codeforces account */}
        <Section title="Codeforces Account">
          <Field
            label="Handle"
            description="Your Codeforces username. Required for submission status polling."
          >
            <input
              type="text"
              value={form.handle || ''}
              onChange={e => set('handle', e.target.value)}
              placeholder="e.g. tourist"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
            />
          </Field>

          <Field
            label="API Key"
            description={
              <span>
                From{' '}
                <button
                  className="text-accent-blue underline"
                  onClick={() => window.api.shell.openExternal('https://codeforces.com/settings/api')}
                >
                  codeforces.com/settings/api
                </button>
                . Used for authenticated API requests (optional for basic use).
              </span>
            }
          >
            <input
              type="text"
              value={form.apiKey || ''}
              onChange={e => set('apiKey', e.target.value)}
              placeholder="API Key"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
            />
          </Field>

          <Field label="API Secret">
            <input
              type="password"
              value={form.apiSecret || ''}
              onChange={e => set('apiSecret', e.target.value)}
              placeholder="API Secret"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
            />
          </Field>
        </Section>

        {/* Code directory */}
        <Section title="Code Directory">
          <Field
            label="Workspace Directory"
            description="CodeDash will watch this folder for .cpp, .java, and .py files to submit or test."
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={form.codeDirectory || ''}
                onChange={e => set('codeDirectory', e.target.value)}
                placeholder="/Users/you/cp"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue font-mono"
              />
              <button
                onClick={() => browseDir('codeDirectory')}
                className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </Field>
        </Section>

        {/* Compilers */}
        <Section title="Compilers & Interpreters">
          <div className="p-3 bg-bg-secondary border border-border rounded-lg flex items-start gap-2 text-xs text-gray-500">
            <Info size={14} className="shrink-0 mt-0.5 text-gray-600" />
            <span>
              These paths are used for local test runs. Leave blank to use the system default (e.g. <code className="text-gray-400">g++</code>,{' '}
              <code className="text-gray-400">python3</code>). For submission, CodeDash uses the Codeforces judge — your local compiler is only for local testing.
            </span>
          </div>

          <Field
            label="C++ Compiler"
            description="Path to g++ or clang++. Also used to select the compiler for local test runs."
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={form.cppCompiler || ''}
                onChange={e => set('cppCompiler', e.target.value)}
                placeholder="/usr/bin/g++"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue font-mono"
              />
              <button onClick={() => browseFile('cppCompiler')} className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors">
                <FolderOpen size={16} />
              </button>
            </div>
          </Field>

          <Field label="Java Compiler (javac)">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.javaCompiler || ''}
                onChange={e => set('javaCompiler', e.target.value)}
                placeholder="javac"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue font-mono"
              />
              <button onClick={() => browseFile('javaCompiler')} className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors">
                <FolderOpen size={16} />
              </button>
            </div>
          </Field>

          <Field label="Java Runner (java)" description="Used to run compiled Java classes.">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.javaRunner || ''}
                onChange={e => set('javaRunner', e.target.value)}
                placeholder="java"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue font-mono"
              />
              <button onClick={() => browseFile('javaRunner')} className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors">
                <FolderOpen size={16} />
              </button>
            </div>
          </Field>

          <Field label="Python Interpreter">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.pythonInterpreter || ''}
                onChange={e => set('pythonInterpreter', e.target.value)}
                placeholder="/usr/bin/python3"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue font-mono"
              />
              <button onClick={() => browseFile('pythonInterpreter')} className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors">
                <FolderOpen size={16} />
              </button>
            </div>
          </Field>
        </Section>

        {/* Submission defaults */}
        <Section title="Submission Defaults">
          <Field
            label="Default Language"
            description="Pre-selected language when submitting a solution."
          >
            <select
              value={form.preferredLanguage || 'cpp17'}
              onChange={e => set('preferredLanguage', e.target.value)}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue"
            >
              <option value="cpp17">C++17 (GCC 9.2)</option>
              <option value="cpp20">C++20 (GCC 11)</option>
              <option value="java8">Java 8</option>
              <option value="java17">Java 17</option>
              <option value="python3">Python 3</option>
              <option value="pypy3">PyPy 3</option>
            </select>
          </Field>
        </Section>
      </div>
    </div>
  )
}
