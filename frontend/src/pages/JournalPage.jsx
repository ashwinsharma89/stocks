import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, BookOpen } from 'lucide-react'
import { journalApi } from '../services/api'
import Loading from '../components/Loading'

export default function JournalPage() {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    symbol: '', trade_type: 'BUY', entry_price: '', exit_price: '',
    quantity: '', entry_date: '', exit_date: '', strategy: '', notes: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [e, s] = await Promise.allSettled([
        journalApi.getEntries(),
        journalApi.getStats(),
      ])
      if (e.status === 'fulfilled') setEntries(e.value)
      if (s.status === 'fulfilled') setStats(s.value)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  function resetForm() {
    setForm({
      symbol: '', trade_type: 'BUY', entry_price: '', exit_price: '',
      quantity: '', entry_date: '', exit_date: '', strategy: '', notes: '',
    })
    setEditId(null)
    setShowForm(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      entry_price: parseFloat(form.entry_price) || 0,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      quantity: parseInt(form.quantity) || 0,
      entry_date: form.entry_date ? new Date(form.entry_date).toISOString() : new Date().toISOString(),
      exit_date: form.exit_date ? new Date(form.exit_date).toISOString() : null,
    }
    try {
      if (editId) {
        await journalApi.updateEntry(editId, payload)
      } else {
        await journalApi.createEntry(payload)
      }
      resetForm()
      loadData()
    } catch (err) { console.error(err) }
  }

  function startEdit(entry) {
    setForm({
      symbol: entry.symbol,
      trade_type: entry.trade_type,
      entry_price: entry.entry_price,
      exit_price: entry.exit_price || '',
      quantity: entry.quantity,
      entry_date: entry.entry_date?.split('T')[0] || '',
      exit_date: entry.exit_date?.split('T')[0] || '',
      strategy: entry.strategy || '',
      notes: entry.notes || '',
    })
    setEditId(entry.id)
    setShowForm(true)
  }

  async function handleDelete(id) {
    try {
      await journalApi.deleteEntry(id)
      loadData()
    } catch (err) { console.error(err) }
  }

  if (loading) return <Loading message="Loading journal..." />

  return (
    <div className="page">
      <div className="page-header">
        <h2>Trading Journal</h2>
        <p>Track and analyze your trades</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Trades</div>
            <div className="stat-value">{stats.total_trades}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value positive">{stats.win_rate}%</div>
            <div className="stat-sub">{stats.winning_trades}W / {stats.losing_trades}L</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total P&L</div>
            <div className={`stat-value ${stats.total_pnl >= 0 ? 'positive' : 'negative'}`}>
              {stats.total_pnl >= 0 ? '+' : ''}{stats.total_pnl?.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg P&L</div>
            <div className={`stat-value ${stats.avg_pnl >= 0 ? 'positive' : 'negative'}`}>
              {stats.avg_pnl >= 0 ? '+' : ''}{stats.avg_pnl?.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Add Button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus size={16} /> Add Trade
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3>{editId ? 'Edit Trade' : 'New Trade'}</h3>
            <button className="btn btn-sm" onClick={resetForm}>Cancel</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Symbol</label>
                <input type="text" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.trade_type} onChange={e => setForm({ ...form, trade_type: e.target.value })}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Entry Price</label>
                <input type="number" step="0.01" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Exit Price</label>
                <input type="number" step="0.01" value={form.exit_price} onChange={e => setForm({ ...form, exit_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Entry Date</label>
                <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Exit Date</label>
                <input type="date" value={form.exit_date} onChange={e => setForm({ ...form, exit_date: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Strategy</label>
                <input type="text" value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })} placeholder="e.g. Breakout, Swing, etc." />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Trade notes..." />
            </div>
            <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add'} Trade</button>
          </form>
        </div>
      )}

      {/* Entries Table */}
      <div className="card">
        <div className="card-header">
          <h3>Trade History</h3>
          <span className="chip chip-blue">{entries.length} trades</span>
        </div>
        {entries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Symbol</th><th>Type</th><th>Qty</th>
                  <th>Entry</th><th>Exit</th><th>P&L</th>
                  <th>Strategy</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '0.78rem' }}>{e.entry_date?.split('T')[0]}</td>
                    <td className="symbol">{e.symbol}</td>
                    <td>
                      <span className={`chip ${e.trade_type === 'BUY' ? 'chip-green' : 'chip-red'}`}>
                        {e.trade_type}
                      </span>
                    </td>
                    <td>{e.quantity}</td>
                    <td>{e.entry_price?.toFixed(2)}</td>
                    <td>{e.exit_price?.toFixed(2) || '-'}</td>
                    <td className={e.pnl >= 0 ? 'positive' : e.pnl < 0 ? 'negative' : ''}>
                      {e.pnl != null ? `${e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.strategy || '-'}</td>
                    <td>
                      <span className={`chip ${e.is_open ? 'chip-yellow' : 'chip-green'}`}>
                        {e.is_open ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => startEdit(e)}><Edit3 size={13} /></button>
                        <button className="btn btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--accent-red)' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={40} />
            <h3>No trades recorded</h3>
            <p>Start tracking your trades by clicking "Add Trade"</p>
          </div>
        )}
      </div>
    </div>
  )
}
