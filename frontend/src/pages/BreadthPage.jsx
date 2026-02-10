import React, { useState, useEffect, useRef, useCallback } from 'react'
import { breadthApi } from '../services/api'
import Loading from '../components/Loading'

export default function BreadthPage() {
  const [breadth, setBreadth] = useState(null)
  const [maData, setMAData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [maPeriod, setMAPeriod] = useState(200)
  const [activeTab, setActiveTab] = useState('breadth')
  const adCanvasRef = useRef(null)
  const ratioCanvasRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'above-ma') loadMAData()
  }, [maPeriod, activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const b = await breadthApi.getBreadth('3mo')
      setBreadth(b)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function loadMAData() {
    try {
      const m = await breadthApi.getAboveMA(maPeriod)
      setMAData(m)
    } catch (err) {
      console.error(err)
    }
  }

  const drawChart = useCallback((canvasEl, dataPoints, valueKey, title, color) => {
    if (!canvasEl || !dataPoints?.length) return
    const ctx = canvasEl.getContext('2d')
    const rect = canvasEl.parentElement.getBoundingClientRect()
    const w = rect.width
    const h = 250
    canvasEl.width = w * 2
    canvasEl.height = h * 2
    canvasEl.style.width = w + 'px'
    canvasEl.style.height = h + 'px'
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, w, h)

    const margin = { top: 20, right: 20, bottom: 30, left: 50 }
    const plotW = w - margin.left - margin.right
    const plotH = h - margin.top - margin.bottom

    const values = dataPoints.map(d => d[valueKey])
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    const range = maxV - minV || 1

    const scaleX = (i) => margin.left + (i / (dataPoints.length - 1)) * plotW
    const scaleY = (v) => margin.top + plotH - ((v - minV) / range) * plotH

    // Grid
    ctx.strokeStyle = 'rgba(42,42,74,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (i / 4) * plotH
      ctx.beginPath()
      ctx.moveTo(margin.left, y)
      ctx.lineTo(margin.left + plotW, y)
      ctx.stroke()
      const val = maxV - (i / 4) * range
      ctx.fillStyle = '#5a6580'
      ctx.font = '9px Inter'
      ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(1), margin.left - 6, y + 3)
    }

    // Zero line
    if (minV < 0 && maxV > 0) {
      const y0 = scaleY(0)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(margin.left, y0)
      ctx.lineTo(margin.left + plotW, y0)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Line
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    dataPoints.forEach((d, i) => {
      const x = scaleX(i)
      const y = scaleY(d[valueKey])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Fill
    ctx.lineTo(scaleX(dataPoints.length - 1), margin.top + plotH)
    ctx.lineTo(margin.left, margin.top + plotH)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + plotH)
    gradient.addColorStop(0, color.replace(')', ',0.2)').replace('rgb', 'rgba'))
    gradient.addColorStop(1, color.replace(')', ',0.01)').replace('rgb', 'rgba'))
    ctx.fillStyle = gradient
    ctx.fill()

    // Title
    ctx.fillStyle = '#e8e8f0'
    ctx.font = '12px Inter'
    ctx.textAlign = 'left'
    ctx.fillText(title, margin.left, margin.top - 6)
  }, [])

  useEffect(() => {
    if (breadth?.data) {
      drawChart(adCanvasRef.current, breadth.data, 'ad_line', 'Advance/Decline Line', 'rgb(0, 212, 255)')
      drawChart(ratioCanvasRef.current, breadth.data, 'ad_ratio', 'A/D Ratio', 'rgb(124, 58, 237)')
    }
  }, [breadth, drawChart])

  if (loading) return <Loading message="Loading market breadth..." />

  return (
    <div className="page">
      <div className="page-header">
        <h2>Market Breadth</h2>
        <p>Analyze overall market health through breadth indicators</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'breadth' ? 'active' : ''}`} onClick={() => setActiveTab('breadth')}>
          Breadth Indicators
        </button>
        <button className={`tab ${activeTab === 'above-ma' ? 'active' : ''}`} onClick={() => setActiveTab('above-ma')}>
          Stocks Above MA
        </button>
      </div>

      {activeTab === 'breadth' && breadth && (
        <>
          {/* Summary Stats */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Market Sentiment</div>
              <div className={`stat-value ${breadth.current_breadth === 'Bullish' ? 'positive' : breadth.current_breadth === 'Bearish' ? 'negative' : ''}`}>
                {breadth.current_breadth}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Advances</div>
              <div className="stat-value positive">{breadth.summary?.latest_advances}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Declines</div>
              <div className="stat-value negative">{breadth.summary?.latest_declines}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">A/D Line</div>
              <div className="stat-value">{breadth.summary?.ad_line}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <canvas ref={adCanvasRef} />
            </div>
            <div className="card">
              <canvas ref={ratioCanvasRef} />
            </div>
          </div>

          {/* Breadth Table */}
          <div className="card">
            <div className="card-header"><h3>Daily Breadth Data</h3></div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Advances</th><th>Declines</th><th>A/D Ratio</th><th>A/D Line</th><th>New Highs</th><th>New Lows</th></tr>
                </thead>
                <tbody>
                  {breadth.data?.slice(-20).reverse().map(d => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td className="positive">{d.advances}</td>
                      <td className="negative">{d.declines}</td>
                      <td className={d.ad_ratio >= 1 ? 'positive' : 'negative'}>{d.ad_ratio}</td>
                      <td>{d.ad_line}</td>
                      <td>{d.new_highs}</td>
                      <td>{d.new_lows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'above-ma' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Moving Average Period:</span>
            {[20, 50, 200].map(p => (
              <button key={p} className={`btn btn-sm ${maPeriod === p ? 'btn-primary' : ''}`} onClick={() => setMAPeriod(p)}>
                {p} DMA
              </button>
            ))}
          </div>

          {maData && (
            <>
              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-label">Above {maPeriod} DMA</div>
                  <div className="stat-value positive">{maData.above_ma}</div>
                  <div className="stat-sub">{maData.percentage_above}% of total</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Below {maPeriod} DMA</div>
                  <div className="stat-value negative">{maData.below_ma}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Stocks</div>
                  <div className="stat-value">{maData.total}</div>
                </div>
              </div>

              {/* Gauge-like visualization */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3>% Stocks Above {maPeriod} DMA</h3></div>
                <div style={{ height: 30, background: 'var(--bg-input)', borderRadius: 15, overflow: 'hidden', margin: '10px 0' }}>
                  <div style={{
                    height: '100%',
                    width: `${maData.percentage_above}%`,
                    background: `linear-gradient(90deg, var(--accent-green), var(--accent-blue))`,
                    borderRadius: 15,
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                  }}>
                    {maData.percentage_above}%
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3>Stock Details</h3></div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Symbol</th><th>Price</th><th>{maPeriod} DMA</th><th>Distance</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {maData.stocks?.map(s => (
                        <tr key={s.symbol}>
                          <td className="symbol">{s.symbol}</td>
                          <td>{s.price}</td>
                          <td>{s.ma}</td>
                          <td className={s.distance_pct >= 0 ? 'positive' : 'negative'}>
                            {s.distance_pct >= 0 ? '+' : ''}{s.distance_pct}%
                          </td>
                          <td>
                            <span className={`chip ${s.above_ma ? 'chip-green' : 'chip-red'}`}>
                              {s.above_ma ? 'Above' : 'Below'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
