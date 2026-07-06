import { useState } from 'react'
import { supabase } from '../supabase'
import StatusBar from '../components/StatusBar'

export default function SearchScreen({ onBack, onOpenProfile }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(value) {
    setQuery(value)
    if (value.trim().length < 2) { setResults([]); setSearched(false); return }

    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, bio, location')
      .ilike('username', `%${value.trim()}%`)
      .limit(20)

    setResults(data ?? [])
    setLoading(false)
    setSearched(true)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Recherche</span>
          <span style={{ width: 32 }} />
        </div>

        {/* Barre de recherche */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg2)', borderRadius: 12,
            padding: '10px 14px', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 16, color: 'var(--t3)' }}>🔍</span>
            <input
              style={{
                flex: 1, background: 'none', border: 'none',
                color: 'var(--t1)', fontSize: 14, outline: 'none',
                fontFamily: 'inherit',
              }}
              placeholder="Rechercher un joueur…"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Résultats */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div className="spinner-wrap"><div className="spinner" /></div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p className="empty-title">Aucun résultat</p>
              <p className="empty-sub">Aucun joueur ne correspond à "{query}"</p>
            </div>
          )}

          {!loading && results.map(p => (
            <div
              key={p.id}
              onClick={() => onOpenProfile(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: p.avatar_color ?? '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {p.initials ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{p.username}</p>
                {p.bio && (
                  <p style={{
                    fontSize: 12, color: 'var(--t3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.bio}
                  </p>
                )}
                {p.location && (
                  <p style={{ fontSize: 11, color: 'var(--t3)' }}>📍 {p.location}</p>
                )}
              </div>
              <span style={{ color: 'var(--t3)', fontSize: 16 }}>›</span>
            </div>
          ))}

          {!searched && (
            <div className="empty-state" style={{ paddingTop: 40 }}>
              <div className="empty-icon">👥</div>
              <p className="empty-title">Trouve des joueurs</p>
              <p className="empty-sub">Tape un pseudo pour trouver d'autres personnages du monde RP.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
