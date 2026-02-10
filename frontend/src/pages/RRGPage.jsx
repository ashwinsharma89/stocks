import React, { useState, useEffect, useRef, useCallback } from 'react'
import { rrgApi } from '../services/api'
import Loading from '../components/Loading'

const QUADRANT_COLORS = {
  Leading: 'rgba(16, 185, 129, 0.08)',
  Weakening: 'rgba(245, 158, 11, 0.08)',
  Lagging: 'rgba(239, 68, 68, 0.08)',
  Improving: 'rgba(0, 212, 255, 0.08)',
}

const QUADRANT_BORDER = {
  Leading: '#10b981',
  Weakening: '#f59e0b',
  Lagging: '#ef4444',
  Improving: '#00d4ff',
}

export default function RRGPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6mo')
  const [mode, setMode] = useState('sectors') // sectors or stocks
  const [customSymbols, setCustomSymbols] = useState('RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK')
  const canvasRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    loadData()
  }, [period, mode])

  async function loadData() {
    setLoading(true)
    try {
      let result
      if (mode === 'sectors') {
        result = await rrgApi.getSectorRRG(period)
      } else {
        const symbols = customSymbols.split(',').map(s => s.trim()).filter(Boolean)
        result = await rrgApi.getStockRRG(symbols, '^NSEI', period)
      }
      setData(result)
    } catch (err) {
      console.error('RRG load error:', err)
    }
    setLoading(false)
  }

  const drawRRG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !data?.data?.length) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.parentElement.getBoundingClientRect()
    const w = rect.width
    const h = 500
    canvas.width = w * 2
    canvas.height = h * 2
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(2, 2)

    // Clear
    ctx.clearRect(0, 0, w, h)

    const margin = { top: 30, right: 30, bottom: 40, left: 50 }
    const plotW = w - margin.left - margin.right
    const plotH = h - margin.top - margin.bottom
    const centerX = margin.left + plotW / 2
    const centerY = margin.top + plotH / 2

    // Find data range
    let minX = 100, maxX = 100, minY = 100, maxY = 100
    data.data.forEach(d => {
      d.tail.forEach(t => {
        minX = Math.min(minX, t.rs_ratio)
        maxX = Math.max(maxX, t.rs_ratio)
        minY = Math.min(minY, t.rs_momentum)
        maxY = Math.max(maxY, t.rs_momentum)
      })
      minX = Math.min(minX, d.rs_ratio)
      maxX = Math.max(maxX, d.rs_ratio)
      minY = Math.min(minY, d.rs_momentum)
      maxY = Math.max(maxY, d.rs_momentum)
    })

    // Add padding
    const rangeX = Math.max(maxX - minX, 2)
    const rangeY = Math.max(maxY - minY, 2)
    minX -= rangeX * 0.15
    maxX += rangeX * 0.15
    minY -= rangeY * 0.15
    maxY += rangeY * 0.15

    const scaleX = (v) => margin.left + ((v - minX) / (maxX - minX)) * plotW
    const scaleY = (v) => margin.top + plotH - ((v - minY) / (maxY - minY)) * plotH

    // Draw quadrant backgrounds
    const x100 = scaleX(100)
    const y100 = scaleY(100)

    // Leading (top-right)
    ctx.fillStyle = QUADRANT_COLORS.Leading
    ctx.fillRect(x100, margin.top, margin.left + plotW - x100, y100 - margin.top)
    // Weakening (bottom-right)
    ctx.fillStyle = QUADRANT_COLORS.Weakening
    ctx.fillRect(x100, y100, margin.left + plotW - x100, margin.top + plotH - y100)
    // Lagging (bottom-left)
    ctx.fillStyle = QUADRANT_COLORS.Lagging
    ctx.fillRect(margin.left, y100, x100 - margin.left, margin.top + plotH - y100)
    // Improving (top-left)
    ctx.fillStyle = QUADRANT_COLORS.Improving
    ctx.fillRect(margin.left, margin.top, x100 - margin.left, y100 - margin.top)

    // Draw crosshair at 100,100
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x100, margin.top)
    ctx.lineTo(x100, margin.top + plotH)
    ctx.moveTo(margin.left, y100)
    ctx.lineTo(margin.left + plotW, y100)
    ctx.stroke()
    ctx.setLineDash([])

    // Quadrant labels
    ctx.font = '10px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.textAlign = 'center'
    ctx.fillText('LEADING', (x100 + margin.left + plotW) / 2, margin.top + 18)
    ctx.fillText('WEAKENING', (x100 + margin.left + plotW) / 2, margin.top + plotH - 8)
    ctx.fillText('LAGGING', (margin.left + x100) / 2, margin.top + plotH - 8)
    ctx.fillText('IMPROVING', (margin.left + x100) / 2, margin.top + 18)

    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(margin.left, margin.top, plotW, plotH)

    // Axis labels
    ctx.fillStyle = '#8892b0'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('RS-Ratio', centerX, h - 8)
    ctx.save()
    ctx.translate(14, centerY)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('RS-Momentum', 0, 0)
    ctx.restore()

    // Tick labels
    ctx.font = '9px Inter, sans-serif'
    ctx.fillStyle = '#5a6580'
    const steps = 5
    for (let i = 0; i <= steps; i++) {
      const vx = minX + (i / steps) * (maxX - minX)
      const vy = minY + (i / steps) * (maxY - minY)
      ctx.textAlign = 'center'
      ctx.fillText(vx.toFixed(1), scaleX(vx), margin.top + plotH + 16)
      ctx.textAlign = 'right'
      ctx.fillText(vy.toFixed(1), margin.left - 6, scaleY(vy) + 3)
    }

    // Color palette
    const colors = [
      '#00d4ff', '#7c3aed', '#10b981', '#ef4444', '#f59e0b',
      '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7', '#6366f1'
    ]

    // Draw each stock/sector
    data.data.forEach((item, idx) => {
      const color = item.color || colors[idx % colors.length]

      // Draw tail
      if (item.tail.length > 1) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        item.tail.forEach((t, i) => {
          const x = scaleX(t.rs_ratio)
          const y = scaleY(t.rs_momentum)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Draw current point
      const px = scaleX(item.rs_ratio)
      const py = scaleY(item.rs_momentum)
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()

      // Label
      ctx.font = '10px Inter, sans-serif'
      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.fillText(item.name, px + 8, py - 4)
    })
  }, [data])

  useEffect(() => {
    drawRRG()
    window.addEventListener('resize', drawRRG)
    return () => window.removeEventListener('resize', drawRRG)
  }, [drawRRG])

  return (
    <div className="page">
      <div className="page-header">
        <h2>Relative Rotation Graphs (RRG)</h2>
        <p>Visualize sector rotation and relative strength dynamics</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="btn-group">
          <button className={`btn btn-sm ${mode === 'sectors' ? 'btn-primary' : ''}`} onClick={() => setMode('sectors')}>
            Sectors
          </button>
          <button className={`btn btn-sm ${mode === 'stocks' ? 'btn-primary' : ''}`} onClick={() => setMode('stocks')}>
            Custom Stocks
          </button>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="3mo">3 Months</option>
          <option value="6mo">6 Months</option>
          <option value="1y">1 Year</option>
        </select>
        {mode === 'stocks' && (
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              type="text"
              value={customSymbols}
              onChange={e => setCustomSymbols(e.target.value)}
              placeholder="RELIANCE,TCS,INFY..."
              style={{ flex: 1, maxWidth: 400 }}
            />
            <button className="btn btn-primary btn-sm" onClick={loadData}>Apply</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>RRG Chart - {mode === 'sectors' ? 'NIFTY Sectors' : 'Custom'} vs NIFTY 50</h3>
          <span className="chip chip-blue">{data?.data?.length || 0} items</span>
        </div>
        {loading ? <Loading /> : (
          <div style={{ position: 'relative' }}>
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Legend / Data Table */}
      {data?.data && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>RRG Data</h3></div>
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>RS-Ratio</th><th>RS-Momentum</th><th>Quadrant</th></tr>
            </thead>
            <tbody>
              {data.data.map(d => (
                <tr key={d.symbol}>
                  <td className="symbol">{d.name}</td>
                  <td>{d.rs_ratio}</td>
                  <td>{d.rs_momentum}</td>
                  <td>
                    <span className={`chip ${d.quadrant === 'Leading' ? 'chip-green' : d.quadrant === 'Improving' ? 'chip-blue' : d.quadrant === 'Weakening' ? 'chip-yellow' : 'chip-red'}`}>
                      {d.quadrant}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
