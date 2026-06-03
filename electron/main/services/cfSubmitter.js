import { BrowserWindow, session } from 'electron'

// Fallback numeric programTypeId values (CF can change these — used only if
// label matching below fails to find an option).
const LANG_IDS = {
  cpp17: '54', cpp20: '89', cpp23: '91',
  java8: '36', java17: '87',
  python3: '31', pypy3: '41'
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function makeHiddenWindow() {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      session: session.defaultSession,
      nodeIntegration: false,
      contextIsolation: false
    }
  })
}

// loadURL rejects with ERR_ABORTED on CF's login redirect — swallow that one.
async function safeLoad(win, url) {
  try {
    await win.loadURL(url)
  } catch (err) {
    if (!String(err.message).includes('ERR_ABORTED')) throw err
  }
}

// Poll an in-page boolean expression until true or timeout.
async function waitForCondition(win, exprSource, timeoutMs = 12000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (win.isDestroyed()) return false
    const ok = await win.webContents.executeJavaScript(`!!(${exprSource})`).catch(() => false)
    if (ok) return true
    await sleep(300)
  }
  return false
}

// Authoritative login check: load a real CF page and look for the logout link
// (a JSESSIONID cookie alone is NOT proof — anonymous visitors get one too).
export async function checkLoggedIn() {
  const win = makeHiddenWindow()
  try {
    await safeLoad(win, 'https://codeforces.com/')
    await waitForCondition(win, `document.querySelector('#header') || document.body`, 8000)
    const info = await win.webContents.executeJavaScript(`
      (() => {
        const loggedIn = !!document.querySelector('a[href*="/logout"]')
        let handle = null
        // Extract the handle from the first profile link's href (robust to markup).
        const link = document.querySelector('a[href^="/profile/"]')
        if (link) {
          const m = link.getAttribute('href').match(/\\/profile\\/([^\\/?#]+)/)
          if (m) handle = decodeURIComponent(m[1])
        }
        return { loggedIn, handle }
      })()
    `).catch(() => ({ loggedIn: false, handle: null }))
    console.log('[cfSubmit] checkLoggedIn:', info)
    return info
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

export async function getSampleTests(contestId, index) {
  const win = makeHiddenWindow()
  try {
    await safeLoad(win, `https://codeforces.com/contest/${contestId}/problem/${index}`)
    const ready = await waitForCondition(win, `document.querySelector('.sample-test')`, 15000)
    if (!ready) return []
    return await win.webContents.executeJavaScript(`
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
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

// Detect a Cloudflare "are you human / just a moment" interstitial.
async function isCloudflareChallenge(win) {
  return win.webContents.executeJavaScript(`
    (() => {
      const t = (document.title || '').toLowerCase()
      if (t.includes('just a moment') || t.includes('attention required') || t.includes('moment')) return true
      if (document.querySelector('#challenge-form, #cf-challenge-running, .cf-browser-verification, #challenge-running, #challenge-stage')) return true
      const b = (document.body ? document.body.innerText : '').toLowerCase()
      return b.includes('checking your browser') || b.includes('verify you are human') ||
             b.includes('needs to review the security') || b.includes('cloudflare')
    })()
  `).catch(() => false)
}

const FORM_READY_EXPR =
  `document.querySelector('select[name="programTypeId"]') && document.querySelector('textarea[name="source"]')`

export async function submitSolution({ contestId, problemIndex, languageId, code }) {
  const cfLangId = LANG_IDS[languageId] || String(languageId)
  const win = makeHiddenWindow()

  try {
    // Use the per-problem problemset submit page — it is the most reliable submit
    // route (the /contest/{id}/submit page redirects away once a round is over).
    await safeLoad(win, `https://codeforces.com/problemset/submit/${contestId}/${problemIndex}`)
    console.log('[cfSubmit] landed at:', win.webContents.getURL())

    if (win.webContents.getURL().includes('/enter')) {
      throw new Error('NOT_LOGGED_IN')
    }

    // If Cloudflare is challenging us, reveal the window so the user can solve it,
    // then wait (longer) for the challenge to clear and the form to appear.
    let formReady = await waitForCondition(win, FORM_READY_EXPR, 6000)
    if (formReady === false && await isCloudflareChallenge(win)) {
      console.log('[cfSubmit] Cloudflare challenge detected — showing window for the user to solve')
      win.show()
      win.focus()
      win.setTitle('Codeforces — please complete the human verification, then wait…')
      formReady = await waitForCondition(win, FORM_READY_EXPR, 90000)
    } else if (formReady === false) {
      // Give a non-Cloudflare slow load a bit more time.
      formReady = await waitForCondition(win, FORM_READY_EXPR, 8000)
    }

    if (formReady === false) {
      // Gather page diagnostics so we know WHY the form is missing.
      const diag = await win.webContents.executeJavaScript(`
        (() => ({
          url: location.href,
          title: document.title,
          loggedIn: !!document.querySelector('a[href*="/logout"]'),
          hasLoginForm: !!document.querySelector('input[name="handleOrEmail"], #enterForm'),
          hasProgramSelect: !!document.querySelector('select[name="programTypeId"]'),
          hasSourceTextarea: !!document.querySelector('textarea[name="source"]'),
          hasAnyForm: !!document.querySelector('form'),
          bodySnippet: (document.body ? document.body.innerText : '').slice(0, 300)
        }))()
      `).catch(e => ({ error: String(e) }))
      console.log('[cfSubmit] form-not-found diagnostics:', diag)

      if (await isCloudflareChallenge(win)) {
        throw new Error('CLOUDFLARE_CHALLENGE')
      }
      if (!diag.loggedIn || diag.hasLoginForm) throw new Error('NOT_LOGGED_IN')
      throw new Error(
        `Could not find the Codeforces submit form even though you appear logged in. ` +
        `URL=${diag.url} title="${diag.title}".`
      )
    }

    // Fill the form: pick language by matching the option label (robust against
    // CF changing numeric ids), set the problem index, and set the source in BOTH
    // the textarea and the ACE editor so nothing overwrites it on submit.
    const fill = await win.webContents.executeJavaScript(`
      (() => {
        const want = ${JSON.stringify(languageId)}
        const fallbackId = ${JSON.stringify(cfLangId)}
        const code = ${JSON.stringify(code)}
        const idx = ${JSON.stringify(String(problemIndex))}
        const r = { lang: false, langLabel: '', problem: false, source: false }

        const matchers = {
          cpp17:  t => /c\\+\\+\\s*17/i.test(t) && !/clang/i.test(t),
          cpp20:  t => /c\\+\\+\\s*20/i.test(t) && !/clang/i.test(t),
          cpp23:  t => /c\\+\\+\\s*23/i.test(t) && !/clang/i.test(t),
          java8:  t => /\\bjava\\b/i.test(t) && /\\b8\\b/.test(t),
          java17: t => /\\bjava\\b/i.test(t) && /\\b17\\b/.test(t),
          python3: t => /python\\s*3/i.test(t) && !/pypy/i.test(t),
          pypy3:  t => /pypy\\s*3/i.test(t)
        }

        const langSel = document.querySelector('select[name="programTypeId"]')
        if (langSel) {
          const m = matchers[want]
          let chosen = null
          if (m) for (const o of langSel.options) { if (m(o.text)) { chosen = o; break } }
          if (!chosen) for (const o of langSel.options) { if (o.value === fallbackId) { chosen = o; break } }
          if (chosen) {
            langSel.value = chosen.value
            langSel.dispatchEvent(new Event('change', { bubbles: true }))
            r.lang = true
            r.langLabel = chosen.text
          }
        }

        const idxSel = document.querySelector('select[name="submittedProblemIndex"]')
        const codeInput = document.querySelector('input[name="submittedProblemCode"]')
        if (idxSel) {
          idxSel.value = idx
          idxSel.dispatchEvent(new Event('change', { bubbles: true }))
          r.problem = idxSel.value === idx
        } else if (codeInput) {
          // Generic problemset submit form: identify the problem by code, e.g. "2118B".
          codeInput.value = ${JSON.stringify(String(contestId) + String(problemIndex))}
          codeInput.dispatchEvent(new Event('input', { bubbles: true }))
          codeInput.dispatchEvent(new Event('change', { bubbles: true }))
          r.problem = true
        } else {
          r.problem = true // problem-specific submit page: problem already fixed
        }

        const ta = document.querySelector('textarea[name="source"]')
        if (ta) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
          setter.call(ta, code)
          ta.dispatchEvent(new Event('input', { bubbles: true }))
          ta.dispatchEvent(new Event('change', { bubbles: true }))
          r.source = true
        }

        // Sync the ACE editor if present (CF reads from it on submit).
        try {
          const aceEl = document.querySelector('.ace_editor')
          if (aceEl && window.ace && window.ace.edit) {
            window.ace.edit(aceEl).setValue(code, -1)
          }
        } catch (e) { /* ignore */ }

        return r
      })()
    `)

    console.log('[cfSubmit] fill result:', fill)

    if (!fill.lang) {
      throw new Error(`Could not select language "${languageId}" on Codeforces (no matching option found)`)
    }
    if (!fill.source) {
      throw new Error('Could not locate the source code field on the Codeforces submit page')
    }

    // Record the form page URL so we can detect when CF navigates away from it.
    const formUrl = win.webContents.getURL()
    console.log('[cfSubmit] submitting from:', formUrl)

    // If the submit form carries a Cloudflare Turnstile widget, it must be solved
    // BEFORE clicking submit (otherwise CF rejects and re-renders, wiping the code).
    const turnstile = await win.webContents.executeJavaScript(`
      (() => {
        const has = !!document.querySelector('.cf-turnstile') ||
                    document.getElementsByName('cf-turnstile-response').length > 0
        const t = document.getElementsByName('cf-turnstile-response')[0]
        return { present: has, solved: !!(t && t.value && t.value.length > 10) }
      })()
    `).catch(() => ({ present: false, solved: false }))
    console.log('[cfSubmit] turnstile:', turnstile)

    if (turnstile.present && !turnstile.solved) {
      console.log('[cfSubmit] waiting for the user to solve Turnstile before submitting')
      win.show()
      win.focus()
      win.setTitle('Codeforces — complete the verification; it will submit automatically')
      const solved = await waitForCondition(
        win,
        `(() => { const t = document.getElementsByName('cf-turnstile-response')[0]; return !!(t && t.value && t.value.length > 10) })()`,
        120000
      )
      if (!solved) throw new Error('CLOUDFLARE_CHALLENGE')
    }

    // Submit the form.
    const clicked = await win.webContents.executeJavaScript(`
      (() => {
        const btn = document.querySelector('form.submit-form input.submit, form input[type="submit"], input.submit, button[type="submit"]')
        if (btn) { btn.click(); return true }
        const ta = document.querySelector('textarea[name="source"]')
        const form = (ta && ta.form) || document.querySelector('form.submit-form')
        if (form) { form.submit(); return true }
        return false
      })()
    `)
    if (!clicked) {
      throw new Error('Could not find the Codeforces submit button')
    }

    // Wait for the outcome: CF navigates to a submissions listing (success), an
    // inline error appears (rejection), or a Cloudflare Turnstile challenge blocks
    // the submit (we then reveal the window so the user can solve it).
    const outcome = await waitForOutcome(win, formUrl)
    console.log('[cfSubmit] outcome:', outcome)

    if (outcome.error) {
      throw new Error(`Codeforces rejected the submission: ${outcome.error}`)
    }
    return { submissionId: outcome.submissionId, submittedAt: Math.floor(Date.now() / 1000) }
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

async function waitForOutcome(win, formUrl, timeoutMs = 120000) {
  const start = Date.now()
  let navigatedAway = false
  let shownForChallenge = false

  while (Date.now() - start < timeoutMs) {
    if (win.isDestroyed()) return { error: 'submission window closed' }

    const elapsed = Date.now() - start
    const res = await win.webContents.executeJavaScript(`
      (() => {
        const url = location.href
        const row = document.querySelector('tr[data-submission-id]')
        const submissionId = row ? parseInt(row.getAttribute('data-submission-id'), 10) : null
        const hasChallenge = !!document.querySelector(
          '.cf-turnstile, [name="cf-turnstile-response"], iframe[src*="challenges.cloudflare.com"], #challenge-form, #challenge-running'
        )
        // Inline validation error (only meaningful while still on the form page).
        let errText = ''
        const candidates = Array.from(document.querySelectorAll('.error, span.error, .alert-error, .for__source'))
        for (const el of candidates) {
          const t = (el.innerText || el.textContent || '').trim()
          if (t && t.length > 3) { errText = t; break }
        }
        return { url, submissionId, errText, hasChallenge }
      })()
    `).catch(() => ({}))

    const movedOff = res.url && res.url !== formUrl
    const onListing = movedOff && /\/(my|status|submission)/.test(res.url)

    // Success: a submission row is visible (the submissions/status page).
    if (res.submissionId) return { submissionId: res.submissionId }
    if (onListing) navigatedAway = true

    // A Cloudflare Turnstile challenge is blocking the submit — reveal the window
    // so the user can solve it; the loop keeps waiting for the navigation.
    if (!movedOff && res.hasChallenge && !shownForChallenge && !win.isDestroyed()) {
      console.log('[cfSubmit] Turnstile challenge during submit — revealing window for the user')
      win.show()
      win.focus()
      win.setTitle('Codeforces — complete the verification to finish submitting')
      shownForChallenge = true
    }

    // Rejection: still on the form page (after a grace period) with an error.
    if (!movedOff && elapsed > 1500 && res.errText) return { error: res.errText }

    await sleep(500)
  }

  // Timed out. If CF navigated us to a listing page, the submission went through
  // (verdict polling will catch up via the API); otherwise report the timeout.
  const finalUrl = !win.isDestroyed()
    ? await win.webContents.executeJavaScript(`location.href`).catch(() => '')
    : ''
  if (navigatedAway || (finalUrl && finalUrl !== formUrl)) return { submissionId: null }
  return { error: 'timed out waiting for Codeforces to accept the submission' }
}
