import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

const MJ_DISCORD_ID = '804959890291294209'

export default function InvestScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [companies, setCompanies]   = useState([])
  const [myInvests, setMyInvests]   = useState([])
  const [selected, setSelected]     = useState(null)
  const [view, setView]             = useState('list') // 'list' | 'detail' | 'mj-new'
  const [loading, setLoading]       = useState(true)
  const [tradeMode, setTradeMode]   = useState('buy') // 'buy' | 'sell'
  const [shares, setShares]         = useState('')
  const [trading, setTrading]       = useState(false)
  const [toast, setToast]           = useState(null)

  // MJ — nouvelle entreprise
  const [newCo, setNewCo] = useState({ name: '', sector: '', description: '', logo_emoji: '🏢', color: '#b96eff', share_price: '100' })
  const [creating, setCreating] = useState(false)

  const isMJ = profile?.discord_id === MJ_DISCORD_ID
  const balance = profile?.balance ?? 0

  useEffect(() => {
    fetchCompanies()
    fetchMyInvests()
    const channel = supabase
      .channel('invest-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => fetchCompanies())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => fetchMyInvests())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchCompanies() {
    const { data } = await supabase.from('companies').select('*').order('share_price', { ascending: false })
    setCompanies(data ?? [])
    setLoading(false)
    if (selected) {
      const updated = data?.find(c => c.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  async function fetchMyInvests() {
    const { data } = await supabase.from('investments').select('*').eq('user_id', user.id).gt('shares', 0)
    setMyInvests(data ?? [])
  }

  function myShares(companyId) {
    return myInvests.find(i => i.company_id === companyId)?.shares ?? 0
  }

  function portfolioValue() {
    return myInvests.reduce((sum, inv) => {
      const co = companies.find(c => c.id === inv.company_id)
      return sum + (co ? co.share_price * inv.shares : 0)
    }, 0)
  }

  async function executeTrade() {
    const qty = parseInt(shares)
    if (!selected || !qty || qty <= 0) return
    setTrading(true)

    const cost = qty * selected.share_price
    const owned = myShares(selected.id)

    try {
      if (tradeMode === 'buy') {
        if (cost > balance) { setToast('❌ Solde insuffisant'); setTimeout(() => setToast(null), 2500); setTrading(false); return }
        await updateProfile({ balance: balance - cost })

        const existing = myInvests.find(i => i.company_id === selected.id)
        if (existing) {
          const newTotal = existing.shares + qty
          const newAvg = Math.round(((existing.avg_buy_price * existing.shares) + cost) / newTotal)
          await supabase.from('investments').update({ shares: newTotal, avg_buy_price: newAvg, updated_at: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('investments').insert({ user_id: user.id, company_id: selected.id, shares: qty, avg_buy_price: selected.share_price })
        }
        setToast(`✅ ${qty} parts de ${selected.name} achetées`)
      } else {
        if (qty > owned) { setToast('❌ Tu n\'as pas assez de parts'); setTimeout(() => setToast(null), 2500); setTrading(false); return }
        await updateProfile({ balance: balance + cost })
        const existing = myInvests.find(i => i.company_id === selected.id)
        await supabase.from('investments').update({ shares: existing.shares - qty, updated_at: new Date().toISOString() }).eq('id', existing.id)
        setToast(`✅ ${qty} parts de ${selected.name} vendues pour $${cost.toLocaleString()}`)
      }
      setTimeout(() => setToast(null), 3000)
      setShares('')
      fetchMyInvests()
    } catch (e) {
      setToast('❌ Erreur transaction')
    }
    setTrading(false)
  }

  async function mjUpdatePrice(company, delta) {
    const newPrice = Math.max(1, company.share_price + delta)
    const history = [...(company.price_history ?? []), company.share_price].slice(-20)
    await supabase.from('companies').update({ share_price: newPrice, price_history: history }).eq('id', company.id)
  }

  async function createCompany() {
    if (!newCo.name.trim()) return
    setCreating(true)
    await supabase.from('companies').insert({
      name: newCo.name.trim(),
      sector: newCo.sector.trim(),
      description: newCo.description.trim(),
      logo_emoji: newCo.logo_emoji,
      color: newCo.color,
      share_price: parseInt(newCo.share_price) || 100,
      created_by: user.id,
    })
    setNewCo({ name: '', sector: '', description: '', logo_emoji: '🏢', color: '#b96eff', share_price: '100' })
    setCreating(false)
    setView('list')
    fetchCompanies()
  }

  // ── VUE MJ NOUVELLE ENTREPRISE ──
  if (view === 'mj-new') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setView('list')}>←</button>
            <span className="app-header-title" style={{ color: '#f59e0b' }}>Nouvelle entreprise</span>
            <span style={{ width: 32 }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCo.logo_emoji} onChange={e => setNewCo(p => ({ ...p, logo_emoji: e.target.value }))}
                style={{ width: 50, textAlign: 'center', fontSize: 22, border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg3)', color: 'var(--t1)' }} />
              <input placeholder="Nom de l'entreprise" value={newCo.name} onChange={e => setNewCo(p => ({ ...p, name: e.target.value }))}
                style={{ flex: 1, border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <input placeholder="Secteur (ex: Technologie)" value={newCo.sector} onChange={e => setNewCo(p => ({ ...p, sector: e.target.value }))}
              style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <textarea placeholder="Description" value={newCo.description} onChange={e => setNewCo(p => ({ ...p, description: e.target.value }))}
              style={{ height: 70, resize: 'none', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <div>
              <label style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Prix de départ par part</label>
              <input type="number" value={newCo.share_price} onChange={e => setNewCo(p => ({ ...p, share_price: e.target.value }))}
                style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#b96eff','#7b9fff','#22c55e','#f59e0b','#ef4444','#c026d3'].map(c => (
                <div key={c} onClick={() => setNewCo(p => ({ ...p, color: c }))} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: newCo.color === c ? '2px solid #fff' : '2px solid transparent',
                }} />
              ))}
            </div>
            <button onClick={createCompany} disabled={creating || !newCo.name.trim()} className="btn-primary">
              {creating ? 'Création…' : 'Créer l\'entreprise'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── VUE DÉTAIL ──
  if (view === 'detail' && selected) {
    const owned = myShares(selected.id)
    const invest = myInvests.find(i => i.company_id === selected.id)
    const gainLoss = invest ? (selected.share_price - invest.avg_buy_price) * invest.shares : 0
    const history = selected.price_history ?? []
    const chartPoints = [...history, selected.share_price].slice(-10)

    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setView('list')}>←</button>
            <span className="app-header-title">{selected.name}</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: `${selected.color}22`, border: `1px solid ${selected.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{selected.logo_emoji}</div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>{selected.name}</p>
                <p style={{ fontSize: 12, color: 'var(--t3)' }}>{selected.sector}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>{selected.description}</p>

            {/* Prix + mini graph */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px' }}>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Prix par part</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: selected.color, fontFamily: "'Space Grotesk', monospace" }}>
                ${selected.share_price.toLocaleString()}
              </p>
              {chartPoints.length > 1 && (
                <MiniChart points={chartPoints} color={selected.color} />
              )}
            </div>

            {/* Ma position */}
            {owned > 0 && (
              <div style={{
                background: `${selected.color}0d`, border: `1px solid ${selected.color}33`,
                borderRadius: 16, padding: '14px',
              }}>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Ma position</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{owned} parts</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Prix moyen : ${invest?.avg_buy_price}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: gainLoss >= 0 ? '#22c55e' : '#ef4444' }}>
                      {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString()}$
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Valeur : ${(selected.share_price * owned).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* MJ contrôle prix */}
            {isMJ && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => mjUpdatePrice(selected, -Math.max(1, Math.round(selected.share_price * 0.1)))} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>📉 -10%</button>
                <button onClick={() => mjUpdatePrice(selected, Math.max(1, Math.round(selected.share_price * 0.1)))} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)',
                  background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>📈 +10%</button>
              </div>
            )}

            {/* Trade */}
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg2)', padding: 4, borderRadius: 14 }}>
              {[['buy', 'Acheter'], ['sell', 'Vendre']].map(([val, label]) => (
                <button key={val} onClick={() => setTradeMode(val)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: tradeMode === val ? (val === 'buy' ? '#22c55e' : '#ef4444') : 'transparent',
                  color: tradeMode === val ? '#fff' : 'var(--t3)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Nombre de parts</p>
              <input type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="0"
                style={{ width: 100, textAlign: 'center', fontSize: 28, fontWeight: 700, background: 'none', border: 'none', color: 'var(--t1)', outline: 'none', fontFamily: "'Space Grotesk', monospace" }} />
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>
                Total : ${((parseInt(shares) || 0) * selected.share_price).toLocaleString()}
              </p>
            </div>

            <button onClick={executeTrade} disabled={trading || !shares} style={{
              padding: '14px', borderRadius: 14, border: 'none',
              background: tradeMode === 'buy' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              opacity: shares ? 1 : 0.5,
            }}>
              {trading ? 'Traitement…' : tradeMode === 'buy' ? `Acheter ${shares || 0} parts` : `Vendre ${shares || 0} parts`}
            </button>
          </div>
          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

  // ── VUE LISTE ──
  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">📊 Bourse</span>
          {isMJ ? <button className="icon-btn" onClick={() => setView('mj-new')}>➕</button> : <span style={{ width: 32 }} />}
        </div>

        {/* Portefeuille */}
        {myInvests.length > 0 && (
          <div style={{
            margin: '0 14px 10px', padding: '12px 14px',
            background: 'linear-gradient(135deg, rgba(185,110,255,0.1), rgba(123,159,255,0.05))',
            border: '1px solid rgba(185,110,255,0.2)', borderRadius: 14,
          }}>
            <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 2 }}>MON PORTEFEUILLE</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Space Grotesk', monospace" }}>
              ${portfolioValue().toLocaleString()}
            </p>
            <p style={{ fontSize: 11, color: 'var(--t3)' }}>{myInvests.length} entreprise{myInvests.length > 1 ? 's' : ''}</p>
          </div>
        )}

        <div className="feed" style={{ flex: 1, padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : companies.map(co => {
            const owned = myShares(co.id)
            const history = co.price_history ?? []
            const prevPrice = history[history.length - 1] ?? co.share_price
            const change = co.share_price - prevPrice
            const changePct = prevPrice ? ((change / prevPrice) * 100).toFixed(1) : 0

            return (
              <div key={co.id} onClick={() => { setSelected(co); setView('detail') }} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: `${co.color}22`, border: `1px solid ${co.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{co.logo_emoji}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{co.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--t3)' }}>{co.sector}{owned > 0 ? ` · ${owned} parts` : ''}</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: co.color, fontFamily: "'Space Grotesk', monospace" }}>
                    ${co.share_price.toLocaleString()}
                  </p>
                  {change !== 0 && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: change > 0 ? '#22c55e' : '#ef4444' }}>
                      {change > 0 ? '↗' : '↘'} {Math.abs(changePct)}%
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    </div>
  )
}

function MiniChart({ points, color }) {
  const w = 240, h = 40
  const max = Math.max(...points), min = Math.min(...points)
  const range = max - min || 1
  const step = w / (points.length - 1 || 1)
  const coords = points.map((v, i) => [i * step, h - ((v - min) / range) * h])
  const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Toast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '10px 18px',
      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
      zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap', animation: 'fadeDown 0.2s ease',
    }}>{msg}</div>
  )
}
