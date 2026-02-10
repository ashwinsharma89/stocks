import React, { useState, useEffect } from 'react'
import { X, Plus, Grid3X3 } from 'lucide-react'
import { stockApi } from '../services/api'
import StockChart from '../components/StockChart'
import Loading from '../components/Loading'

const LAYOUTS = [
  { id: '1x1', label: '1x1', cols: 1, count: 1 },
  { id: '2x1', label: '2x1', cols: 2, count: 2 },
  { id: '2x2', label: '2x2', cols: 2, count: 4 },
  { id: '3x1', label: '3x1', cols: 3, count: 3 },
]

const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY']

export default function ChartPage() {
  const [layout, setLayout] = useState('2x2')
  const [panels, setPanels] = useState(DEFAULT_SYMBOLS.map(s => ({ symbol: s, period: '1y' })))
  const [chartData, setChartData] = useState({})
  const [loading, setLoading] = useState({})

  const currentLayout = LAYOUTS.find(l => l.id === layout)

  useEffect(() => {
    panels.forEach(p => {
      if (p.symbol && !chartData[`${p.symbol}_${p.period}`]) {
        loadChart(p.symbol, p.period)
      }
    })
  }, [panels])

  async function loadChart(symbol, period) {
    const key = `${symbol}_${period}`
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const data = await stockApi.getHistory(symbol, period)
      setChartData(prev => ({ ...prev, [key]: data }))
    } catch (err) { console.error(err) }
    setLoading(prev => ({ ...prev, [key]: false }))
  }

  function updatePanel(index, field, value) {
    const newPanels = [...panels]
    newPanels[index] = { ...newPanels[index], [field]: value }
    setPanels(newPanels)
    if (field === 'symbol' || field === 'period') {
      loadChart(newPanels[index].symbol, newPanels[index].period)
    }
  }

  function handleSymbolSubmit(index, e) {
    e.preventDefault()
    const sym = panels[index].symbol?.toUpperCase()
    if (sym) loadChart(sym, panels[index].period)
  }

  // Adjust panels to layout
  useEffect(() => {
    const count = currentLayout?.count || 1
    if (panels.length < count) {
      setPanels([...panels, ...Array(count - panels.length).fill({ symbol: '', period: '1y' })])
    }
  }, [layout])

  const visiblePanels = panels.slice(0, currentLayout?.count || 1)

  return (
    <div className="page">
      <div className="page-header">
        <h2>Multi-Chart View</h2>
        <p>View multiple stock charts side by side</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Layout:</span>
        {LAYOUTS.map(l => (
          <button
            key={l.id}
            className={`btn btn-sm ${layout === l.id ? 'btn-primary' : ''}`}
            onClick={() => setLayout(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className={`chart-grid grid-${layout}`}>
        {visiblePanels.map((panel, idx) => {
          const key = `${panel.symbol}_${panel.period}`
          const data = chartData[key]
          const isLoading = loading[key]

          return (
            <div key={idx} className="chart-panel">
              <div className="chart-panel-header">
                <form onSubmit={(e) => handleSymbolSubmit(idx, e)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={panel.symbol}
                    onChange={e => updatePanel(idx, 'symbol', e.target.value.toUpperCase())}
                    placeholder="Symbol"
                    style={{ width: 120, padding: '4px 8px', fontSize: '0.82rem' }}
                  />
                  <select
                    value={panel.period}
                    onChange={e => updatePanel(idx, 'period', e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  >
                    <option value="1mo">1M</option>
                    <option value="3mo">3M</option>
                    <option value="6mo">6M</option>
                    <option value="1y">1Y</option>
                    <option value="2y">2Y</option>
                    <option value="5y">5Y</option>
                  </select>
                </form>
                {panel.symbol && data && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {data.length} candles
                  </span>
                )}
              </div>
              <div style={{ padding: 8 }}>
                {isLoading ? (
                  <Loading message={`Loading ${panel.symbol}...`} />
                ) : data && data.length > 0 ? (
                  <StockChart data={data} symbol={panel.symbol} height={layout === '2x2' ? 280 : 380} />
                ) : (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <Grid3X3 size={32} />
                    <p>Enter a symbol above</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
