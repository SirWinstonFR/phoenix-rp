import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  { id: 'identity',        label: 'Identité',        sub: 'Falsification & nettoyage', icon: '🪪' },
  { id: 'criminal_record', label: 'Casier judiciaire', sub: 'Effacement de dossiers',   icon: '📁' },
  { id: 'vehicle',         label: 'Véhicules',        sub: 'Blanchiment & export',      icon: '🚗' },
  { id: 'hacking',         label: 'Piratage',         sub: 'Cyber-espionnage',          icon: '💻' },
  { id: 'leaks',           label: 'Leaks',            sub: 'Informations & dossiers',   icon: '🗂️' },
]

export default function DarkWebScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [unlocked, setUnlocked]   = useState(false)
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(false)
  const [checking, setChecking]   = useState(false)
  const [view, setView]           = useState('home') // 'home' | 'category' | 'detail' | 'bounties' | 'newBounty'
  const [selectedCat, setSelectedCat]   = useState(null)
  const [listings, setListings]         = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [bounties, setBounties]         = useState([])
  const [ordering, setOrdering]         = useState(false)
  const [toast, setToast]               = useState(null)

  // Nouvelle prime
  const [bTarget, setBTarget] = useState('')
  const [bReason, setBReason] = useState('')
  const [bAmount, setBAmount] = useState('')
  const [bPosting, setBPosting] = useState(false)

  const balance = profile?.balance ?? 0

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function checkPassword() {
    setChecking(true)
    setError(false)
    const { data } = await supabase.from('darkweb_config').select('access_code').eq('id', 1).maybeSingle()
    if (data && password.trim().toLowerCase() === data.access_code.trim().toLowerCase()) {
      setUnlocked(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 500)
    }
    setChecking(false)
  }

  async function openCategory(cat) {
    setSelectedCat(cat)
    setView('category')
    const { data } = await supabase
      .from('darkweb_listings')
      .select('*')
      .eq('category', cat.id)
      .eq('active', true)
      .order('price', { ascending: true })
    setListings(data ?? [])
  }

  async function fetchBounties() {
    const { data } = await supabase
      .from('darkweb_bounties')
      .select('*')
      .eq('status', 'active')
      .order('amount', { ascending: false })
    setBounties(data ?? [])
  }

  async function order(item) {
    if (item.price > balance) { showToast('❌ Fonds insuffisants'); return }
    setOrdering(true)
    try {
      await updateProfile({ balance: balance - item.price })
      await supabase.from('transactions').insert({
        from_user_id: profile.id,
        to_user_id:   profile.id, // pas de destinataire traçable — juste un débit
        amount:       item.price,
        type:         'purchase',
        note:         `Darknet — ${item.name}`,
      })
      showToast('✅ Commande passée. Vous serez contacté.')
      setView('home')
    } catch (e) {
      showToast('❌ Erreur de transaction')
    }
    setOrdering(false)
  }

  async function postBounty() {
    const amt = parseInt(bAmount)
    if (!bTarget.trim() || !amt || amt <= 0) return
    setBPosting(true)
    await supabase.from('darkweb_bounties').insert({
      target_name: bTarget.trim(),
      reason:       bReason.trim(),
      amount:       amt,
      posted_by:    profile.id,
    })
    setBTarget(''); setBReason(''); setBAmount('')
    setBPosting(false)
    fetchBounties()
    setView('bounties')
  }

  // ── PORTE D'ACCÈS ──
  if (!unlocked) {
    return (
      <div className="phone" style={{ background: '#000' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: 24, fontFamily: "'Courier New', monospace",
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Scanlines */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, rgba(0,255,136,0.02) 0px, transparent 1px, transparent 2px)',
          }} />

          <button onClick={onBack} style={{
            position: 'absolute', top: 20, left: 20,
            background: 'none', border: 'none', color: '#2a5c3f',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>← quitter</button>

          <div style={{ fontSize: 40, filter: 'grayscale(1)', opacity: 0.6 }}>🧅</div>

          <p style={{
            fontSize: 13, color: '#00ff88', letterSpacing: '0.15em',
            textShadow: '0 0 8px rgba(0,255,136,0.5)',
          }}>
            ACCÈS RESTREINT
          </p>

          <p style={{ fontSize: 11, color: '#2a5c3f', textAlign: 'center', maxWidth: 220, lineHeight: 1.6 }}>
            Vous êtes sur le point d'entrer dans un réseau non indexé.
            Aucune identité n'est requise. Seul le mot de passe compte.
          </p>

          <div style={{
            width: '100%', maxWidth: 240,
            animation: error ? 'shakeGate 0.4s ease' : 'none',
          }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkPassword()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: '100%', background: '#0a0a0a',
                border: `1px solid ${error ? '#ff3355' : '#1a3d28'}`,
                borderRadius: 4, padding: '12px 14px',
                color: '#00ff88', fontSize: 16, fontFamily: 'inherit',
                textAlign: 'center', letterSpacing: '0.3em',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: '#ff3355', letterSpacing: '0.05em' }}>
              ACCÈS REFUSÉ
            </p>
          )}

          <button
            onClick={checkPassword}
            disabled={checking || !password}
            style={{
              padding: '10px 28px', borderRadius: 4,
              background: 'none', border: '1px solid #00ff88',
              color: '#00ff88', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: password ? 1 : 0.3,
            }}
          >
            {checking ? 'VÉRIFICATION…' : 'CONNEXION'}
          </button>
        </div>

        <style>{`
          @keyframes shakeGate {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
        `}</style>
      </div>
    )
  }

  // ── VUE PRIMES ──
  if (view === 'bounties') {
    return (
      <div className="phone" style={{ background: '#0a0510' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
            <button className="icon-btn" onClick={() => setView('home')}>←</button>
            <span className="app-header-title" style={{ color: '#a855f7', WebkitTextFillColor: '#a855f7' }}>Contrats</span>
            <button className="icon-btn" onClick={() => setView('newBounty')} style={{ color: '#a855f7' }}>➕</button>
          </div>

          <div className="feed" style={{ flex: 1, padding: '12px 14px' }}>
            {bounties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p className="empty-title">Aucun contrat actif</p>
                <p className="empty-sub">Sois le premier à mettre une tête à prix.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bounties.map(b => (
                  <div key={b.id} style={{
                    background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 14, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{b.target_name}</p>
                      <p style={{ fontSize: 16, fontWeight: 900, color: '#a855f7', fontFamily: "'Space Grotesk', monospace" }}>
                        ${b.amount.toLocaleString()}
                      </p>
                    </div>
                    {b.reason && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{b.reason}</p>}
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, letterSpacing: '0.05em' }}>
                      POSTÉ ANONYMEMENT
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── NOUVELLE PRIME ──
  if (view === 'newBounty') {
    return (
      <div className="phone" style={{ background: '#0a0510' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
            <button className="icon-btn" onClick={() => setView('bounties')}>←</button>
            <span className="app-header-title" style={{ color: '#a855f7', WebkitTextFillColor: '#a855f7' }}>Nouveau contrat</span>
            <span style={{ width: 32 }} />
          </div>

          <div className="form-screen" style={{ gap: 14 }}>
            <div className="form-group">
              <label>Nom de la cible</label>
              <input value={bTarget} onChange={e => setBTarget(e.target.value)} placeholder="Nom du personnage" />
            </div>
            <div className="form-group">
              <label>Raison (optionnel)</label>
              <textarea value={bReason} onChange={e => setBReason(e.target.value)} placeholder="Pourquoi cette prime ?" style={{ height: 70 }} />
            </div>
            <div className="form-group">
              <label>Montant de la prime</label>
              <input type="number" value={bAmount} onChange={e => setBAmount(e.target.value)} placeholder="0" />
            </div>
            <button
              onClick={postBounty}
              disabled={bPosting || !bTarget.trim() || !bAmount}
              style={{
                padding: '13px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {bPosting ? 'Publication…' : '🎯 Publier le contrat'}
            </button>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              Le contrat est publié anonymement.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── DÉTAIL D'UN SERVICE ──
  if (view === 'detail' && selectedItem) {
    return (
      <div className="phone" style={{ background: '#0a0510' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
            <button className="icon-btn" onClick={() => setView('category')}>←</button>
            <span className="app-header-title" style={{ color: '#a855f7', WebkitTextFillColor: '#a855f7' }}>Détail</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{selectedItem.icon}</div>
              <p style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{selectedItem.name}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{selectedItem.description}</p>
            </div>

            <div style={{
              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>PRIX</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: '#a855f7', fontFamily: "'Space Grotesk', monospace" }}>
                  ${selectedItem.price.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>SOLDE</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: balance >= selectedItem.price ? '#22c55e' : '#ef4444' }}>
                  ${balance.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => order(selectedItem)}
              disabled={ordering || balance < selectedItem.price}
              style={{
                padding: '14px', borderRadius: 14, border: 'none',
                background: balance >= selectedItem.price
                  ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                  : 'rgba(255,255,255,0.06)',
                color: balance >= selectedItem.price ? '#fff' : '#555',
                fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {ordering ? 'Transaction…' : balance < selectedItem.price ? 'Fonds insuffisants' : 'Commander'}
            </button>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Transaction anonyme. Aucun remboursement.
            </p>
          </div>
          {toast && <DarkToast msg={toast} />}
        </div>
      </div>
    )
  }

  // ── VUE CATÉGORIE ──
  if (view === 'category' && selectedCat) {
    return (
      <div className="phone" style={{ background: '#0a0510' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
            <button className="icon-btn" onClick={() => setView('home')}>←</button>
            <span className="app-header-title" style={{ color: '#a855f7', WebkitTextFillColor: '#a855f7' }}>{selectedCat.label}</span>
            <span style={{ width: 32 }} />
          </div>

          <div className="feed" style={{ flex: 1, padding: '12px 14px' }}>
            {listings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-title">Aucun service disponible</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {listings.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setView('detail') }}
                    style={{
                      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.name}</p>
                      <p style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.35)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{item.description}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#a855f7', fontFamily: "'Space Grotesk', monospace", flexShrink: 0 }}>
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── ACCUEIL DU MARCHÉ ──
  return (
    <div className="phone" style={{ background: '#0a0510' }}>
      <div className="screen">
        <div className="app-header" style={{ borderColor: 'rgba(139,92,246,0.2)', background: 'rgba(10,5,16,0.9)' }}>
          <button className="icon-btn" onClick={onBack} style={{ color: '#a855f7' }}>←</button>
          <span style={{
            fontSize: 17, fontWeight: 800, letterSpacing: -0.3,
            background: 'linear-gradient(135deg, #a855f7, #6d28d9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>🧅 The Hollow</span>
          <span style={{ width: 32 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', scrollbarWidth: 'none' }}>

          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 20 }}>
            RÉSEAU NON INDEXÉ · ANONYMAT GARANTI
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => openCategory(cat)}
                style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: '16px 14px', cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.background = 'rgba(168,85,247,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{cat.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{cat.label}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{cat.sub}</p>
              </div>
            ))}
          </div>

          {/* Tableau des primes */}
          <div
            onClick={() => { setView('bounties'); fetchBounties() }}
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(109,40,217,0.05))',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 16, padding: '18px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{ fontSize: 28 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Tableau des contrats</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Têtes mises à prix</p>
            </div>
            <span style={{ color: '#a855f7', fontSize: 18 }}>›</span>
          </div>

          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginTop: 24, letterSpacing: '0.05em' }}>
            The Hollow n'est ni responsable ni affilié à aucune transaction.
          </p>
        </div>

        {toast && <DarkToast msg={toast} />}
      </div>
    </div>
  )
}

function DarkToast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#1a0f26', border: '1px solid rgba(168,85,247,0.3)',
      borderRadius: 14, padding: '10px 18px',
      fontSize: 13, fontWeight: 700, color: '#fff',
      zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap',
    }}>{msg}</div>
  )
}
