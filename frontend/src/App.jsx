import React, { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Activity, PieChart, BarChart3, Search,
  ScanLine, LineChart, BookOpen, Star, TrendingUp, Grid3X3,
  Layers, Zap, Target, ArrowUpDown
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import RRGPage from './pages/RRGPage'
import BreadthPage from './pages/BreadthPage'
import SectorPage from './pages/SectorPage'
import ScannerPage from './pages/ScannerPage'
import ChartPage from './pages/ChartPage'
import StockDetail from './pages/StockDetail'
import JournalPage from './pages/JournalPage'
import WatchlistPage from './pages/WatchlistPage'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/stock/${searchQuery.trim().toUpperCase()}`)
      setSearchQuery('')
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <TrendingUp size={24} style={{ color: '#00d4ff' }} />
          <h1>ChartsMaze</h1>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Overview</div>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          <div className="nav-section">Analytics</div>
          <NavLink to="/rrg" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Activity size={18} /> RRG Charts
          </NavLink>
          <NavLink to="/breadth" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} /> Market Breadth
          </NavLink>
          <NavLink to="/sectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <PieChart size={18} /> Sector Analysis
          </NavLink>

          <div className="nav-section">Scanners</div>
          <NavLink to="/scanners" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ScanLine size={18} /> Scanners
          </NavLink>

          <div className="nav-section">Charts</div>
          <NavLink to="/charts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Grid3X3 size={18} /> Multi-Chart
          </NavLink>

          <div className="nav-section">Tools</div>
          <NavLink to="/journal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BookOpen size={18} /> Trade Journal
          </NavLink>
          <NavLink to="/watchlist" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Star size={18} /> Watchlists
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <form onSubmit={handleSearch} className="search-box">
            <Search size={16} style={{ color: '#5a6580' }} />
            <input
              type="text"
              placeholder="Search stocks... (e.g. RELIANCE, TCS)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="topbar-actions">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Data updates EOD by 5 PM IST
            </span>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rrg" element={<RRGPage />} />
          <Route path="/breadth" element={<BreadthPage />} />
          <Route path="/sectors" element={<SectorPage />} />
          <Route path="/scanners" element={<ScannerPage />} />
          <Route path="/charts" element={<ChartPage />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
        </Routes>
      </main>
    </div>
  )
}
