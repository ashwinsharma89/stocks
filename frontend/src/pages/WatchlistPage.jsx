import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Star, X } from 'lucide-react'
import { watchlistApi, stockApi } from '../services/api'
import Loading from '../components/Loading'

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([])
  const [activeWL, setActiveWL] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [addSymbol, setAddSymbol] = useState('')

  useEffect(() => { loadWatchlists() }, [])
  useEffect(() => { if (activeWL) loadQuotes() }, [activeWL])

  async function loadWatchlists() {
    setLoading(true)
    try {
      const wls = await watchlistApi.getAll()
      setWatchlists(wls)
      if (wls.length > 0 && !activeWL) setActiveWL(wls[0])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function loadQuotes() {
    if (!activeWL?.symbols?.length) { setQuotes([]); return }
    try {
      const q = await stockApi.getQuotes(activeWL.symbols)
      setQuotes(q)
    } catch (err) { console.error(err) }
  }

  async function createWatchlist(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const wl = await watchlistApi.create({ name: newName, symbols: [] })
      setWatchlists([...watchlists, wl])
      setActiveWL(wl)
      setNewName('')
      setShowCreate(false)
    } catch (err) { console.error(err) }
  }

  async function deleteWatchlist(id) {
    try {
      await watchlistApi.remove(id)
      const updated = watchlists.filter(w => w.id !== id)
      setWatchlists(updated)
      if (activeWL?.id === id) setActiveWL(updated[0] || null)
    } catch (err) { console.error(err) }
  }

  async function handleAddSymbol(e) {
    e.preventDefault()
    if (!addSymbol.trim() || !activeWL) return
    try {
      const updated = await watchlistApi.addSymbol(activeWL.id, addSymbol.trim().toUpperCase())
      setActiveWL(updated)
      setWatchlists(watchlists.map(w => w.id === updated.id ? updated : w))
      setAddSymbol('')
      loadQuotes()
    } catch (err) { console.error(err) }
  }

  async function handleRemoveSymbol(symbol) {
    if (!activeWL) return
    try {
      const updated = await watchlistApi.removeSymbol(activeWL.id, symbol)
      setActiveWL(updated)
      setWatchlists(watchlists.map(w => w.id === updated.id ? updated : w))
      setQuotes(quotes.filter(q => q.symbol !== symbol))
    } catch (err) { console.error(err) }
  }

  if (loading) return <Loading message="Loading watchlists..." />

  return (
    <div className="page">
      <div className="page-header">
        <h2>Watchlists</h2>
        <p>Monitor your favorite stocks</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar - Watchlist list */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowCreate(!showCreate)}>
            <Plus size={16} /> New Watchlist
          </button>

          {showCreate && (
            <form onSubmit={createWatchlist} style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Watchlist name"
                style={{ marginBottom: 8 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" className="btn btn-primary btn-sm">Create</button>
                <button type="button" className="btn btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          )}

          {watchlists.map(wl => (
            <div
              key={wl.id}
              onClick={() => setActiveWL(wl)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 'var(--radius)', cursor: 'pointer',
                marginBottom: 4,
                background: activeWL?.id === wl.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                borderLeft: activeWL?.id === wl.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{wl.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{wl.symbols?.length || 0} stocks</div>
              </div>
              <button
                className="btn btn-sm"
                onClick={(e) => { e.stopPropagation(); deleteWatchlist(wl.id) }}
                style={{ color: 'var(--accent-red)', padding: '2px 6px' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {watchlists.length === 0 && !showCreate && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No watchlists yet
            </div>
          )}
        </div>

        {/* Main - Stock quotes */}
        <div style={{ flex: 1 }}>
          {activeWL ? (
            <div className="card">
              <div className="card-header">
                <h3>{activeWL.name}</h3>
                <form onSubmit={handleAddSymbol} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={addSymbol}
                    onChange={e => setAddSymbol(e.target.value)}
                    placeholder="Add symbol..."
                    style={{ width: 140, padding: '5px 10px' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm"><Plus size={14} /> Add</button>
                </form>
              </div>

              {quotes.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Name</th><th>Price</th>
                      <th>Change</th><th>Volume</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.symbol}>
                        <td><Link to={`/stock/${q.symbol}`} className="symbol">{q.symbol}</Link></td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{q.name}</td>
                        <td style={{ fontWeight: 600 }}>{q.price?.toFixed(2)}</td>
                        <td className={q.change_percent >= 0 ? 'positive' : 'negative'}>
                          {q.change_percent >= 0 ? '+' : ''}{q.change_percent?.toFixed(2)}%
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{q.volume ? (q.volume / 1e6).toFixed(2) + 'M' : '-'}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleRemoveSymbol(q.symbol)}
                            style={{ color: 'var(--accent-red)' }}
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <Star size={40} />
                  <h3>No stocks in this watchlist</h3>
                  <p>Add symbols using the input above</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Star size={48} />
              <h3>Select or create a watchlist</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
