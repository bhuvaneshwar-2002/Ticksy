import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Checklist from './pages/Checklist'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <div className="shell">
        <header className="topbar">
          <div className="brand">Daily Checklist</div>
          <nav className="nav">
            <NavLink to="/" end>
              Checklist
            </NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Checklist />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
