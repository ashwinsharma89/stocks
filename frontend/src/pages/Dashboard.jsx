import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity, BarChart3, ArrowRight } from 'lucide-react'
import { stockApi, sectorApi, scannerApi } from '../services/api'
import Loading from '../components/Loading'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [sectors, setSectors] = useState([])
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [ov, sec, pat] = await Promise.allSettled([
        stockApi.getMarketOverview(),
        sectorApi.getPerformance(),
        scannerApi.patternScan(),
      ])
      if (ov.status === 'fulfilled') setOverview(ov.value)
      if (sec.status === 'fulfilled') setSectors(sec.value)
      if (pat.status === 'fulfilled') setPatterns(pat.value)
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }

  if (loading) return <Loading message="Loading dashboard..." />

  return (
    <div className="page">
      <div className="page-header">
        <h2>Market Dashboard</h2>
        <p>Real-time market overview, sector performance, and signals</p>
      </div>

      {/* Index Cards */}
      {overview?.indices && (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {overview.indices.map(idx => (
            <div key={idx.symbol} className="index-card">
              <div className="index-name">{idx.name}</div>
              <div className="index-value">{idx.value?.toLocaleString('en-IN')}</div>
              <div className={`index-change ${idx.change >= 0 ? 'positive' : 'negative'}`}>
                {idx.change >= 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.change_percent?.toFixed(2)}%)
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Top Gainers */}
        <div className="card">
          <div className="card-header">
            <h3><TrendingUp size={16} style={{ color: 'var(--accent-green)', marginRight: 8 }} />Top Gainers</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>Price</th><th>Change</th></tr>
            </thead>
            <tbody>
              {overview?.top_gainers?.map(s => (
                <tr key={s.symbol}>
                  <td><Link to={`/stock/${s.symbol}`} className="symbol">{s.symbol}</Link></td>
                  <td>{s.price?.toFixed(2)}</td>
                  <td className="positive">+{s.change_percent?.toFixed(2)}%</td>
                </tr>
              ))}
              {(!overview?.top_gainers || overview.top_gainers.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Losers */}
        <div className="card">
          <div className="card-header">
            <h3><TrendingDown size={16} style={{ color: 'var(--accent-red)', marginRight: 8 }} />Top Losers</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>Price</th><th>Change</th></tr>
            </thead>
            <tbody>
              {overview?.top_losers?.map(s => (
                <tr key={s.symbol}>
                  <td><Link to={`/stock/${s.symbol}`} className="symbol">{s.symbol}</Link></td>
                  <td>{s.price?.toFixed(2)}</td>
                  <td className="negative">{s.change_percent?.toFixed(2)}%</td>
                </tr>
              ))}
              {(!overview?.top_losers || overview.top_losers.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Sector Performance</h3>
          <Link to="/sectors" className="btn btn-sm">View All <ArrowRight size={14} /></Link>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Sector</th><th>1D</th><th>1W</th><th>1M</th><th>3M</th><th>6M</th><th>1Y</th></tr>
          </thead>
          <tbody>
            {sectors.slice(0, 8).map(s => (
              <tr key={s.sector}>
                <td style={{ fontWeight: 600 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, marginRight: 8 }} />
                  {s.sector}
                </td>
                {['change_1d', 'change_1w', 'change_1m', 'change_3m', 'change_6m', 'change_1y'].map(key => (
                  <td key={key} className={s[key] >= 0 ? 'positive' : 'negative'}>
                    {s[key] >= 0 ? '+' : ''}{s[key]?.toFixed(2)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pattern Signals */}
      <div className="card">
        <div className="card-header">
          <h3>Pattern Signals</h3>
          <Link to="/scanners" className="btn btn-sm">All Scanners <ArrowRight size={14} /></Link>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Symbol</th><th>Price</th><th>Change</th><th>Signal</th><th>Bias</th></tr>
          </thead>
          <tbody>
            {patterns.slice(0, 10).map((s, i) => (
              <tr key={`${s.symbol}-${i}`}>
                <td><Link to={`/stock/${s.symbol}`} className="symbol">{s.symbol}</Link></td>
                <td>{s.price?.toFixed(2)}</td>
                <td className={s.change_percent >= 0 ? 'positive' : 'negative'}>
                  {s.change_percent >= 0 ? '+' : ''}{s.change_percent?.toFixed(2)}%
                </td>
                <td><span className="chip chip-blue">{s.signal}</span></td>
                <td>
                  <span className={`chip ${s.details?.bias === 'bullish' ? 'chip-green' : s.details?.bias === 'bearish' ? 'chip-red' : 'chip-yellow'}`}>
                    {s.details?.bias || 'neutral'}
                  </span>
                </td>
              </tr>
            ))}
            {patterns.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No patterns detected</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
