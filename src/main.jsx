import React, { Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const ExplorerPage = lazy(() => import('./features/explorer/ExplorerPage.jsx'))

function AppRouter() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (event) => {
    const target = event.target
    const link = target instanceof Element ? target.closest('a[href="/dashboard"], a[href="/"]') : target?.parentElement?.closest('a[href="/dashboard"], a[href="/"]')
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (window.location.pathname !== link.pathname) window.history.pushState({}, '', link.pathname)
    setPathname(window.location.pathname)
    window.scrollTo(0, 0)
  }

  const isDashboard = pathname.replace(/\/+$/, '') === '/dashboard'
  return <div onClick={navigate}>
    {isDashboard ? <Suspense fallback={<main className="min-h-screen bg-[#040406] px-6 py-16 text-[#F4F4F6] flex items-center justify-center font-mono text-xs tracking-[0.24em] uppercase" role="status"><span className="inline-flex items-center gap-3 px-5 py-3 rounded-full frosted-glass-pill"><span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-pulse" />Loading NISAR data dashboard…</span></main>}><ExplorerPage /></Suspense> : <App />}
  </div>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
