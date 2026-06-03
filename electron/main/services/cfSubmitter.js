import { BrowserWindow, session } from 'electron'

const LANG_IDS = {
  cpp17: '54', cpp20: '79',
  java8: '36', java17: '87',
  python3: '31', pypy3: '41'
}

export async function getSampleTests(contestId, index) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        session: session.defaultSession,
        nodeIntegration: false,
        contextIsolation: false
      }
    })

    const timeout = setTimeout(() => {
      if (!win.isDestroyed()) win.destroy()
      reject(new Error('Timeout loading problem page'))
    }, 20000)

    win.loadURL(`https://codeforces.com/contest/${contestId}/problem/${index}`)

    win.webContents.on('did-finish-load', async () => {
      try {
        const tests = await win.webContents.executeJavaScript(`
          (() => {
            const st = document.querySelector('.sample-test')
            if (!st) return []
            const inputs = Array.from(st.querySelectorAll('.input pre'))
              .map(el => (el.innerText || el.textContent || '').trim())
            const outputs = Array.from(st.querySelectorAll('.output pre'))
              .map(el => (el.innerText || el.textContent || '').trim())
            return inputs.map((input, i) => ({ input, output: outputs[i] || '' }))
          })()
        `)
        clearTimeout(timeout)
        win.destroy()
        resolve(tests)
      } catch (err) {
        clearTimeout(timeout)
        if (!win.isDestroyed()) win.destroy()
        reject(err)
      }
    })

    win.webContents.on('did-fail-load', (_, code, desc) => {
      clearTimeout(timeout)
      if (!win.isDestroyed()) win.destroy()
      reject(new Error(`Failed to load: ${desc}`))
    })
  })
}

export async function submitSolution({ contestId, problemIndex, languageId, code }) {
  const cfLangId = LANG_IDS[languageId] || languageId

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        session: session.defaultSession,
        nodeIntegration: false,
        contextIsolation: false
      }
    })

    let phase = 'loading'

    const timeout = setTimeout(() => {
      if (!win.isDestroyed()) win.destroy()
      reject(new Error('Submission timed out'))
    }, 30000)

    win.loadURL(`https://codeforces.com/contest/${contestId}/submit`)

    win.webContents.on('did-finish-load', async () => {
      const url = win.webContents.getURL()

      if (phase === 'loading') {
        if (url.includes('/enter')) {
          clearTimeout(timeout)
          win.destroy()
          reject(new Error('NOT_LOGGED_IN'))
          return
        }

        if (url.includes('/submit')) {
          phase = 'submitting'
          try {
            await win.webContents.executeJavaScript(`
              (async () => {
                const langSelect = document.querySelector('select[name="programTypeId"]')
                if (langSelect) {
                  langSelect.value = '${cfLangId}'
                  langSelect.dispatchEvent(new Event('change', { bubbles: true }))
                }
                const textarea = document.querySelector('textarea[name="source"]')
                if (textarea) {
                  const setter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 'value'
                  ).set
                  setter.call(textarea, ${JSON.stringify(code)})
                  textarea.dispatchEvent(new Event('input', { bubbles: true }))
                  textarea.dispatchEvent(new Event('change', { bubbles: true }))
                }
                const idxSelect = document.querySelector('select[name="submittedProblemIndex"]')
                if (idxSelect) {
                  idxSelect.value = '${problemIndex}'
                  idxSelect.dispatchEvent(new Event('change', { bubbles: true }))
                }
                const btn = document.querySelector('.submit, button[type="submit"], input[type="submit"]')
                if (btn) btn.click()
              })()
            `)
          } catch (err) {
            clearTimeout(timeout)
            if (!win.isDestroyed()) win.destroy()
            reject(err)
          }
        }
      } else if (phase === 'submitting' && !url.includes('/submit')) {
        phase = 'done'
        clearTimeout(timeout)

        let submissionId = null
        try {
          submissionId = await win.webContents.executeJavaScript(`
            (() => {
              const row = document.querySelector('tr[data-submission-id]')
              return row ? parseInt(row.getAttribute('data-submission-id'), 10) : null
            })()
          `)
        } catch { /* ignored */ }

        win.destroy()
        resolve({ submissionId, submittedAt: Math.floor(Date.now() / 1000) })
      }
    })

    win.webContents.on('did-fail-load', (_, code, desc) => {
      clearTimeout(timeout)
      if (!win.isDestroyed()) win.destroy()
      reject(new Error(`Page load failed: ${desc}`))
    })
  })
}
