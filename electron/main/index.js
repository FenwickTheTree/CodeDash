import { app, BrowserWindow, ipcMain, session, dialog, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { getProblems, getUserInfo, getUserStatus, getSubmissionStatus } from './services/cfApi.js'
import { getSampleTests, submitSolution, checkLoggedIn } from './services/cfSubmitter.js'
import { runTests, getFilesInDir } from './services/localRunner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULTS = {
  handle: '', apiKey: '', apiSecret: '', codeDirectory: '',
  cppCompiler: '/usr/bin/g++', javaCompiler: 'javac', javaRunner: 'java',
  pythonInterpreter: '/usr/bin/python3', preferredLanguage: 'cpp17', cfLanguageId: '54',
  favorites: [],
  theme: 'dark'
}

// Lightweight JSON settings store (replaces electron-store for Electron 31 ESM compat)
const store = {
  get _path() { return path.join(app.getPath('userData'), 'codedash-settings.json') },
  get store() {
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(this._path, 'utf-8')) } }
    catch { return { ...DEFAULTS } }
  },
  set(key, value) {
    const data = this.store
    data[key] = value
    fs.mkdirSync(path.dirname(this._path), { recursive: true })
    fs.writeFileSync(this._path, JSON.stringify(data, null, 2))
  }
}

let mainWindow = null
let loginWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Allow CF pages to load in webview without CSP interference
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
      }
    })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Settings ────────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => store.store)

ipcMain.handle('settings:set', (_, updates) => {
  Object.entries(updates).forEach(([k, v]) => store.set(k, v))
  return store.store
})

ipcMain.handle('file:browseDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('file:browseFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Code Files', extensions: ['cpp', 'java', 'py'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

ipcMain.handle('cf:login', () => {
  return new Promise((resolve) => {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.focus()
      resolve({ status: 'already_open' })
      return
    }

    loginWindow = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Login to Codeforces',
      parent: mainWindow,
      modal: false,
      webPreferences: {
        session: session.defaultSession,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    loginWindow.loadURL('https://codeforces.com/enter')

    loginWindow.webContents.on('did-navigate', (_, url) => {
      if (!url.includes('/enter') && !url.includes('/register')) {
        loginWindow.close()
        resolve({ status: 'logged_in' })
      }
    })

    loginWindow.on('closed', () => {
      loginWindow = null
      resolve({ status: 'closed' })
    })
  })
})

ipcMain.handle('cf:checkLogin', async () => {
  try {
    // Authoritative check (looks for the logout link on a real CF page).
    return await checkLoggedIn()
  } catch {
    return { loggedIn: false }
  }
})

ipcMain.handle('cf:logout', async () => {
  await session.defaultSession.clearStorageData({ storages: ['cookies'] })
  return { status: 'logged_out' }
})

// ─── Problems API ─────────────────────────────────────────────────────────────

ipcMain.handle('cf:getProblems', async (_, filters) => {
  return getProblems(filters)
})

ipcMain.handle('cf:getUserInfo', async (_, handle) => {
  return getUserInfo(handle)
})

ipcMain.handle('cf:getUserStatus', async (_, handle) => {
  return getUserStatus(handle, 1, 20)
})

ipcMain.handle('cf:getSampleTests', async (_, contestId, index) => {
  return getSampleTests(contestId, index)
})

// ─── Submission ───────────────────────────────────────────────────────────────

ipcMain.handle('cf:submit', async (_, params) => {
  const result = await submitSolution(params)

  // Verdict polling needs the CF handle. Prefer the one from Settings, but fall
  // back to the actual logged-in handle so polling works even if Settings is blank.
  let handle = params.handle
  if (!handle) {
    handle = (await checkLoggedIn().catch(() => ({})))?.handle || null
  }
  console.log('[cfSubmit] polling handle:', handle)

  // The submit page scrape may not yield the id — fall back to the API and find
  // the freshly created submission for this problem.
  let submissionId = result.submissionId
  if (!submissionId && handle) {
    submissionId = await findRecentSubmissionId({ ...params, handle }).catch(() => null)
  }

  if (submissionId && handle) {
    pollSubmission(submissionId, handle)
  }
  // `polling` tells the renderer whether live verdicts will arrive.
  return { ...result, submissionId, handle, polling: !!(submissionId && handle) }
})

async function findRecentSubmissionId({ handle, contestId, problemIndex }) {
  // CF may take a moment to register the submission; retry a few times.
  for (let i = 0; i < 5; i++) {
    const subs = await getUserStatus(handle, 1, 10).catch(() => [])
    const match = subs.find(s =>
      s.problem && s.problem.contestId === Number(contestId) && s.problem.index === problemIndex
    )
    if (match) return match.id
    await new Promise(r => setTimeout(r, 1500))
  }
  return null
}

ipcMain.handle('cf:getSubmissionStatus', async (_, submissionId, handle) => {
  return getSubmissionStatus(submissionId, handle)
})

async function pollSubmission(submissionId, handle) {
  const terminalVerdicts = new Set(['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED',
    'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'REJECTED', 'FAILED', 'PARTIAL'])

  let attempts = 0

  const poll = async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    attempts++
    try {
      const submission = await getSubmissionStatus(submissionId, handle)
      if (submission) {
        mainWindow.webContents.send('cf:submissionUpdate', submission)
        if (!terminalVerdicts.has(submission.verdict) && attempts < 60) {
          setTimeout(poll, 2000)
        }
      } else if (attempts < 60) {
        setTimeout(poll, 3000)
      }
    } catch {
      if (attempts < 60) setTimeout(poll, 3000)
    }
  }

  setTimeout(poll, 2000)
}

// ─── Local Runner ─────────────────────────────────────────────────────────────

ipcMain.handle('file:runTests', async (_, params) => {
  return runTests(params)
})

ipcMain.handle('file:getFilesInDir', async (_, dir) => {
  return getFilesInDir(dir)
})

ipcMain.handle('file:readFile', async (_, filePath) => {
  return fs.promises.readFile(filePath, 'utf-8')
})

ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
