import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ProblemBrowser from './pages/ProblemBrowser'
import ProblemView from './pages/ProblemView'
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'
import useStore from './store/useStore'

export default function App() {
  const { setSettings, setLoggedIn, updateSubmission, setCurrentSubmission, setFavorites, setTheme } = useStore()

  useEffect(() => {
    // Load settings (and hydrate favorites from them)
    window.api.settings.get().then(s => {
      setSettings(s)
      setFavorites(s.favorites || [])
      const t = s.theme || 'dark'
      document.documentElement.setAttribute('data-theme', t)
      setTheme(t)
    })

    // Check login status
    window.api.cf.checkLogin().then(({ loggedIn }) => setLoggedIn(loggedIn))

    // Subscribe to submission updates from main process
    const unsub = window.api.on('cf:submissionUpdate', (submission) => {
      if (submission) {
        updateSubmission(submission.id, submission)
      }
    })

    return () => { if (unsub) unsub() }
  }, [])

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/problems" replace />} />
            <Route path="/problems" element={<ProblemBrowser />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/problem/:contestId/:index" element={<ProblemView />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
