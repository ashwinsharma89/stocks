import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine, Zap, BarChart3, Target, Layers } from 'lucide-react'
import { scannerApi } from '../services/api'
import Loading from '../components/Loading'

const SCANNER_TYPES = [
  { id: 'gap', name: 'Gap Scanner', icon: Layers, desc: 'Find stocks with unfilled price gaps' },
  { id: 'volume', name: 'Volume Scanner', icon: BarChart3, desc: 'Detect unusual volume activity' },
  { id: 'breakout', name: 'Breakout Scanner', icon: Zap, desc: 'Find breakout/breakdown stocks' },
  { id: 'pattern', name: 'Pattern Scanner', icon: Target, desc: 'Identify chart pattern signals' },
]

export default function ScannerPage() {
  const [activeScanner, setActiveScanner] = useState('gap')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({
    min_gap_pct: 2.0,
    volume_multiplier: 2.0,
    lookback: 20,
  })

  useEffect(() => { runScanner() }, [activeScanner])

  async function runScanner() {
    setLoading(true)
    setResults([])
    try {
      let data
      switch (activeScanner) {
        case 'gap': data = await scannerApi.gapScan(params.min_gap_pct); break
        case 'volume': data = await scannerApi.volumeScan(params.volume_multiplier); break
        case 'breakout': data = await scannerApi.breakoutScan(params.lookback); break
        case 'pattern': data = await scannerApi.patternScan(); break
      }
      setResults(data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const currentScanner = SCANNER_TYPES.find(s => s.id === activeScanner)

  return (
    <div className="page">
      <div className="page-header">
        <h2>Stock Scanners</h2>
        <p>Identify high-probability trading setups with automated scanners</p>
      </div>

      {/* Scanner Type Selector */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {SCANNER_TYPES.map(s => {
          const Icon = s.icon
          return (
            <div
              key={s.id}
              className="card"
              onClick={() => setActiveScanner(s.id)}
              style={{
                cursor: 'pointer',
                borderColor: activeScanner === s.id ? 'var(--accent-blue)' : undefined,
                background: activeScanner === s.id ? 'rgba(0,212,255,0.05)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={20} style={{ color: activeScanner === s.id ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Parameters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Parameters:</span>

          {activeScanner === 'gap' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Min Gap %:</label>
              <input
                type="number"
                value={params.min_gap_pct}
                onChange={e => setParams({ ...params, min_gap_pct: parseFloat(e.target.value) || 2 })}
                style={{ width: 80 }}
                step="0.5"
              />
            </div>
          )}

          {activeScanner === 'volume' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Volume Multiplier:</label>
              <input
                type="number"
                value={params.volume_multiplier}
                onChange={e => setParams({ ...params, volume_multiplier: parseFloat(e.target.value) || 2 })}
                style={{ width: 80 }}
                step="0.5"
              />
            </div>
          )}

          {activeScanner === 'breakout' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Lookback Days:</label>
              <input
                type="number"
                value={params.lookback}
                onChange={e => setParams({ ...params, lookback: parseInt(e.target.value) || 20 })}
                style={{ width: 80 }}
              />
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={runScanner}>
            <ScanLine size={14} /> Run Scanner
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header">
          <h3>{currentScanner?.name} Results</h3>
          <span className="chip chip-blue">{results.length} matches</span>
        </div>

        {loading ? <Loading /> : (
          results.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Volume</th>
                  <th>Signal</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.symbol}-${i}`}>
                    <td><Link to={`/stock/${r.symbol}`} className="symbol">{r.symbol}</Link></td>
                    <td>{r.price?.toFixed(2)}</td>
                    <td className={r.change_percent >= 0 ? 'positive' : 'negative'}>
                      {r.change_percent >= 0 ? '+' : ''}{r.change_percent?.toFixed(2)}%
                    </td>
                    <td>{(r.volume / 1e6).toFixed(2)}M</td>
                    <td>
                      <span className={`chip ${
                        r.signal?.includes('Up') || r.signal?.includes('Bullish') || r.signal?.includes('Breakout') || r.signal?.includes('High') || r.signal?.includes('Golden') || r.signal?.includes('Oversold') || r.signal?.includes('Near 52W')
                          ? 'chip-green'
                          : r.signal?.includes('Down') || r.signal?.includes('Bearish') || r.signal?.includes('Breakdown') || r.signal?.includes('Death') || r.signal?.includes('Overbought')
                            ? 'chip-red'
                            : 'chip-yellow'
                      }`}>
                        {r.signal}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {Object.entries(r.details || {}).map(([k, v]) =>
                        `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? v.toFixed(2) : v}`
                      ).join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <ScanLine size={40} />
              <h3>No results found</h3>
              <p>Try adjusting scanner parameters</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
