import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sectorApi } from '../services/api'
import Loading from '../components/Loading'

function getHeatmapColor(pct) {
  if (pct > 3) return 'rgba(16, 185, 129, 0.9)'
  if (pct > 1.5) return 'rgba(16, 185, 129, 0.6)'
  if (pct > 0.5) return 'rgba(16, 185, 129, 0.35)'
  if (pct > 0) return 'rgba(16, 185, 129, 0.2)'
  if (pct > -0.5) return 'rgba(239, 68, 68, 0.2)'
  if (pct > -1.5) return 'rgba(239, 68, 68, 0.35)'
  if (pct > -3) return 'rgba(239, 68, 68, 0.6)'
  return 'rgba(239, 68, 68, 0.9)'
}

export default function SectorPage() {
  const [sectors, setSectors] = useState([])
  const [heatmap, setHeatmap] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('performance')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [sec, heat] = await Promise.allSettled([
        sectorApi.getPerformance(),
        sectorApi.getHeatmap(),
      ])
      if (sec.status === 'fulfilled') setSectors(sec.value)
      if (heat.status === 'fulfilled') setHeatmap(heat.value)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  if (loading) return <Loading message="Loading sector analysis..." />

  // Group heatmap by sector
  const heatmapBySector = {}
  heatmap.forEach(item => {
    if (!heatmapBySector[item.sector]) heatmapBySector[item.sector] = []
    heatmapBySector[item.sector].push(item)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sector Analysis</h2>
        <p>Track sector performance, rotation, and individual stock heatmaps</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          Performance
        </button>
        <button className={`tab ${activeTab === 'heatmap' ? 'active' : ''}`} onClick={() => setActiveTab('heatmap')}>
          Heatmap
        </button>
      </div>

      {activeTab === 'performance' && (
        <div className="card">
          <div className="card-header">
            <h3>Sector Performance Across Timeframes</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sector</th>
                <th>Stocks</th>
                <th>1 Day</th>
                <th>1 Week</th>
                <th>1 Month</th>
                <th>3 Months</th>
                <th>6 Months</th>
                <th>1 Year</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map(s => (
                <tr key={s.sector}>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: s.color, marginRight: 8 }} />
                    {s.sector}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.stock_count}</td>
                  {['change_1d', 'change_1w', 'change_1m', 'change_3m', 'change_6m', 'change_1y'].map(key => (
                    <td key={key}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        background: s[key] >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: s[key] >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {s[key] >= 0 ? '+' : ''}{s[key]?.toFixed(2)}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Top stocks per sector */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Top Stocks by Sector</h3>
            <div className="grid-3">
              {sectors.map(s => (
                <div key={s.sector} className="card" style={{ padding: 14 }}>
                  <h4 style={{ fontSize: '0.88rem', marginBottom: 10, color: s.color }}>{s.sector}</h4>
                  {s.top_stocks?.map(st => (
                    <div key={st.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.82rem' }}>
                      <Link to={`/stock/${st.symbol}`} className="symbol">{st.symbol}</Link>
                      <span className={st.change_percent >= 0 ? 'positive' : 'negative'}>
                        {st.change_percent >= 0 ? '+' : ''}{st.change_percent}%
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="card">
          <div className="card-header">
            <h3>Market Heatmap</h3>
            <span className="chip chip-blue">{heatmap.length} stocks</span>
          </div>
          {Object.entries(heatmapBySector).map(([sector, stocks]) => (
            <div key={sector} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{sector}</h4>
              <div className="heatmap-grid">
                {stocks.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)).map(stock => (
                  <Link
                    key={stock.symbol}
                    to={`/stock/${stock.symbol}`}
                    className="heatmap-cell"
                    style={{ background: getHeatmapColor(stock.change_percent), color: '#fff' }}
                  >
                    <div className="cell-symbol">{stock.symbol}</div>
                    <div className="cell-change">
                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent}%
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {heatmap.length === 0 && (
            <div className="empty-state"><h3>No heatmap data available</h3></div>
          )}
        </div>
      )}
    </div>
  )
}
