import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { stockApi } from '../services/api'
import StockChart from '../components/StockChart'
import Loading from '../components/Loading'

export default function StockDetail() {
  const { symbol } = useParams()
  const [detail, setDetail] = useState(null)
  const [period, setPeriod] = useState('1y')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [symbol])
  useEffect(() => { loadChart() }, [symbol, period])

  async function loadData() {
    setLoading(true)
    try {
      const d = await stockApi.getDetail(symbol)
      setDetail(d)
      if (d.ohlc) setChartData(d.ohlc)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function loadChart() {
    try {
      const data = await stockApi.getHistory(symbol, period)
      if (data) setChartData(data)
    } catch (err) { console.error(err) }
  }

  if (loading) return <Loading message={`Loading ${symbol}...`} />
  if (!detail || !detail.symbol) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Stock not found: {symbol}</h3>
          <Link to="/" className="btn" style={{ marginTop: 12 }}><ArrowLeft size={14} /> Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0
  const prevPrice = chartData.length > 1 ? chartData[chartData.length - 2].close : latestPrice
  const change = latestPrice - prevPrice
  const changePct = prevPrice ? (change / prevPrice) * 100 : 0

  return (
    <div className="page">
      <Link to="/" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>{detail.name || symbol}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="chip chip-blue">{symbol}</span>
            {detail.sector && <span className="chip chip-purple">{detail.sector}</span>}
            {detail.industry && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{detail.industry}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{latestPrice.toFixed(2)}</div>
          <div className={change >= 0 ? 'positive' : 'negative'} style={{ fontSize: '1rem', fontWeight: 600 }}>
            {change >= 0 ? <TrendingUp size={16} style={{ marginRight: 4 }} /> : <TrendingDown size={16} style={{ marginRight: 4 }} />}
            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Price Chart</h3>
          <div className="btn-group">
            {['1mo', '3mo', '6mo', '1y', '2y', '5y'].map(p => (
              <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : ''}`} onClick={() => setPeriod(p)}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <StockChart data={chartData} symbol={symbol} height={420} />
        ) : (
          <div className="empty-state"><p>No chart data available</p></div>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Market Cap', value: detail.market_cap ? `${(detail.market_cap / 1e10).toFixed(2)} Cr` : 'N/A' },
          { label: 'P/E Ratio', value: detail.pe_ratio?.toFixed(2) || 'N/A' },
          { label: '52W High', value: detail.week_52_high?.toFixed(2) || 'N/A' },
          { label: '52W Low', value: detail.week_52_low?.toFixed(2) || 'N/A' },
          { label: 'P/B Ratio', value: detail.pb_ratio?.toFixed(2) || 'N/A' },
          { label: 'EPS', value: detail.eps?.toFixed(2) || 'N/A' },
          { label: 'Div Yield', value: detail.dividend_yield ? `${(detail.dividend_yield * 100).toFixed(2)}%` : 'N/A' },
          { label: 'Avg Volume', value: detail.avg_volume ? `${(detail.avg_volume / 1e6).toFixed(2)}M` : 'N/A' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {detail.description && (
        <div className="card">
          <div className="card-header"><h3>About {detail.name || symbol}</h3></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {detail.description}
          </p>
        </div>
      )}
    </div>
  )
}
