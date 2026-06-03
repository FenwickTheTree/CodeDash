import { NavLink } from 'react-router-dom'
import { Code2, Star, Settings, LogIn, LogOut, Wifi, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

export default function Sidebar() {
  const { isLoggedIn, setLoggedIn, sidebarCollapsed, toggleSidebar, settings, favorites, theme, setTheme } = useStore()

  async function handleLogin() {
    const result = await window.api.cf.login()
    if (result.status === 'logged_in') {
      setLoggedIn(true)
    }
    // Re-check after window closes
    const { loggedIn } = await window.api.cf.checkLogin()
    setLoggedIn(loggedIn)
  }

  async function handleLogout() {
    await window.api.cf.logout()
    setLoggedIn(false)
  }

  return (
    <aside className={`flex flex-col bg-bg-secondary border-r border-border transition-all duration-200 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
      {/* Logo */}
      <div
        className={`flex items-center justify-between py-4 border-b border-border ${sidebarCollapsed ? 'px-3' : 'pl-20 pr-3'}`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-accent-blue shrink-0" />
            <span className="font-bold text-sm text-white tracking-wide">CodeDash</span>
          </div>
        )}
        {sidebarCollapsed && <Code2 size={20} className="text-accent-blue mx-auto" />}
        <button onClick={toggleSidebar} style={{ WebkitAppRegion: 'no-drag' }} className="text-gray-500 hover:text-gray-300 ml-auto">
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1 px-2">
        <NavLink
          to="/problems"
          className={({ isActive }) =>
            `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-accent-blue/20 text-white'
                : 'text-gray-400 hover:bg-bg-tertiary hover:text-gray-200'
            }`
          }
        >
          <Code2 size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Problems</span>}
        </NavLink>

        <NavLink
          to="/favorites"
          className={({ isActive }) =>
            `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-accent-blue/20 text-white'
                : 'text-gray-400 hover:bg-bg-tertiary hover:text-gray-200'
            }`
          }
        >
          <Star size={16} className="shrink-0" />
          {!sidebarCollapsed && <span className="flex-1">Favorites</span>}
          {!sidebarCollapsed && favorites.length > 0 && (
            <span className="text-xs bg-bg-tertiary text-gray-300 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {favorites.length}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-accent-blue/20 text-white'
                : 'text-gray-400 hover:bg-bg-tertiary hover:text-gray-200'
            }`
          }
        >
          <Settings size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* Theme toggle */}
      <div className="px-2 pb-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm text-gray-400 hover:bg-bg-tertiary hover:text-gray-200 transition-colors"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
          {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
        </button>
      </div>

      {/* Auth section */}
      <div className="p-2 border-t border-border">
        {isLoggedIn ? (
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 py-1">
                <Wifi size={12} className="text-green-400 shrink-0" />
                <span className="text-xs text-green-400 truncate">{settings.handle || 'Logged in'}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm text-gray-400 hover:bg-bg-tertiary hover:text-gray-200 transition-colors"
            >
              <LogOut size={16} className="shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm text-accent-blue hover:bg-accent-blue/10 transition-colors"
          >
            <LogIn size={16} className="shrink-0" />
            {!sidebarCollapsed && <span>Login to CF</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
