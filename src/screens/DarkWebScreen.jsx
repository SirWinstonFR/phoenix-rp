import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const ORANGE = '#e8752c'
const ORANGE_LIGHT = '#f5a052'
const ORANGE_DIM = 'rgba(232,117,44,0.15)'

const CATEGORIES = [
  { id: 'identity',        label: 'Identité',          sub: 'Falsification & nettoyage', icon: '🪪' },
  { id: 'criminal_record', label: 'Casier judiciaire', sub: 'Effacement de dossiers',    icon: '📁' },
  { id: 'vehicle',         label: 'Véhicules',         sub: 'Blanchiment & export',      icon: '🚗' },
  { id: 'hacking',         label: 'Piratage',          sub: 'Cyber-espionnage',          icon: '💻' },
  { id: 'leaks',           label: 'Leaks',             sub: 'Informations & dossiers',   icon: '🗂️' },
]

export default function DarkWebScreen({ onBack }) {
  const { profile, updateProfile } = useAuth()
  const [unlocked, setUnlocked]   = useState(false)
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(false)
  const [checking, setChecking]   = useState(false)
  const [view, setView]           = useState('home')
  const [selectedCat, setSelectedCat]   = useState(null)
  const [listings, setListings]         = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [bounties, setBounties]         = useState([])
  const [ordering, setOrdering]         = useState(false)
  const [toast, setToast]               = useState(null)

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
        to_user_id:   profile.id,
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
      <div className="phone" style={{ background: '#040201' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: 24, fontFamily: "'Courier New', monospace",
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Scanlines orange */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'repeating-linear-gradient(0deg, rgba(232,117,44,0.025) 0px, transparent 1px, transparent 3px)',
          }} />

          {/* Bruit diagonal subtil */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.4,
            background: 'repeating-linear-gradient(115deg, transparent 0px, transparent 60px, rgba(232,117,44,0.02) 61px, transparent 62px)',
          }} />

          <div style={{
            position: 'absolute', top: '28%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 280, height: 280, borderRadius: '50%',
            background: `radial-gradient(circle, ${ORANGE_DIM} 0%, transparent 70%)`,
            pointerEvents: 'none', animation: 'gatePulse 3.5s ease-in-out infinite',
          }} />

          <button onClick={onBack} style={{
            position: 'absolute', top: 20, left: 20,
            background: 'none', border: 'none', color: 'rgba(232,117,44,0.4)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', zIndex: 2,
          }}>← quitter</button>

          {/* Statut connexion façon terminal */}
          <p style={{
            fontSize: 9, color: 'rgba(232,117,44,0.35)', letterSpacing: '0.1em',
            position: 'relative', zIndex: 1,
          }}>
            <span className="gate-blink">●</span> CONNEXION AU RÉSEAU MASQUÉ…
          </p>

          <div style={{
            fontSize: 38, position: 'relative', zIndex: 1,
            filter: `drop-shadow(0 0 16px ${ORANGE_DIM})`,
            animation: 'gateFlicker 4s ease-in-out infinite',
          }}>🧅</div>

          <p style={{
            fontSize: 13, fontWeight: 700, color: ORANGE_LIGHT, letterSpacing: '0.18em',
            position: 'relative', zIndex: 1,
          }}>
            ACCÈS RESTREINT<span className="gate-cursor">_</span>
          </p>

          <div style={{
            width: '100%', maxWidth: 230, position: 'relative', zIndex: 1,
            animation: error ? 'shakeGate 0.4s ease' : 'none',
          }}>
            <p style={{ fontSize: 9, color: 'rgba(232,117,44,0.4)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>
              CLEF D'ACCÈS
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkPassword()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: '100%', background: 'rgba(232,117,44,0.04)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(232,117,44,0.3)'}`,
                borderRadius: 6, padding: '13px 16px',
                color: ORANGE_LIGHT, fontSize: 15, fontFamily: "'Courier New', monospace",
                textAlign: 'center', letterSpacing: '0.3em',
                outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { if (!error) { e.target.style.borderColor = ORANGE; e.target.style.boxShadow = `0 0 0 3px ${ORANGE_DIM}` } }}
              onBlur={e => { if (!error) { e.target.style.borderColor = 'rgba(232,117,44,0.3)'; e.target.style.boxShadow = 'none' } }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: '#ef4444', letterSpacing: '0.08em', position: 'relative', zIndex: 1 }}>
              [ ACCÈS REFUSÉ ]
            </p>
          )}

          <button
            onClick={checkPassword}
            disabled={checking || !password}
            style={{
              padding: '12px 32px', borderRadius: 6,
              background: password ? `linear-gradient(135deg, ${ORANGE}, #c85f1e)` : 'rgba(255,255,255,0.04)',
              border: 'none',
              color: password ? '#000' : '#555', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em',
              cursor: password ? 'pointer' : 'not-allowed', fontFamily: "'Courier New', monospace",
              boxShadow: password ? `0 6px 20px ${ORANGE_DIM}` : 'none',
              transition: 'all 0.2s',
              position: 'relative', zIndex: 1,
            }}
          >
            {checking ? '[ VÉRIFICATION… ]' : '[ ENTRER ]'}
          </button>

          <p style={{
            fontSize: 8, color: 'rgba(232,117,44,0.2)', letterSpacing: '0.06em',
            position: 'relative', zIndex: 1, marginTop: 4,
          }}>
            NŒUD #{Math.random().toString(16).slice(2, 8).toUpperCase()} · CHIFFRÉ
          </p>
        </div>

        <style>{`
          @keyframes shakeGate {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
          @keyframes gatePulse {
            0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
            50%      { opacity: 1; transform: translate(-50%,-50%) scale(1.08); }
          }
          @keyframes gateFlicker {
            0%, 92%, 100% { opacity: 1; }
            93% { opacity: 0.4; }
            94% { opacity: 1; }
            96% { opacity: 0.5; }
            97% { opacity: 1; }
          }
          .gate-blink {
            animation: gateBlinkDot 1.4s ease-in-out infinite;
          }
          @keyframes gateBlinkDot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          .gate-cursor {
            animation: gateBlinkDot 1s step-start infinite;
          }
        `}</style>
      </div>
    )
  }

  // ── VUE PRIMES ──
  if (view === 'bounties') {
    return (
      <div className="phone" style={{ background: '#050302' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(232,117,44,0.15)' }}>
            <button className="icon-btn" onClick={() => setView('home')} style={{ color: ORANGE_LIGHT }}>←</button>
            <span className="app-header-title" style={{ color: ORANGE_LIGHT, WebkitTextFillColor: ORANGE_LIGHT }}>Contrats</span>
            <button className="icon-btn" onClick={() => setView('newBounty')} style={{ color: ORANGE_LIGHT }}>➕</button>
          </div>

          <div className="feed" style={{ flex: 1, padding: '12px 14px' }}>
            {bounties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p className="empty-title">Aucun contrat actif</p>
                <p className="empty-sub">Sois le premier à mettre une tête à prix.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {bounties.map((b, i) => (
                  <div key={b.id} className="dw-row" style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,117,44,0.15)',
                    borderRadius: 14, padding: '14px 16px',
                    animation: `dwFadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#f5f2ee' }}>{b.target_name}</p>
                      <p style={{ fontSize: 16, fontWeight: 900, color: ORANGE_LIGHT, fontFamily: "'Space Grotesk', monospace" }}>
                        ${b.amount.toLocaleString()}
                      </p>
                    </div>
                    {b.reason && <p style={{ fontSize: 12, color: 'rgba(245,242,238,0.45)', lineHeight: 1.5 }}>{b.reason}</p>}
                    <p style={{ fontSize: 9, color: 'rgba(245,242,238,0.2)', marginTop: 8, letterSpacing: '0.08em' }}>
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
      <div className="phone" style={{ background: '#050302' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(232,117,44,0.15)' }}>
            <button className="icon-btn" onClick={() => setView('bounties')} style={{ color: ORANGE_LIGHT }}>←</button>
            <span className="app-header-title" style={{ color: ORANGE_LIGHT, WebkitTextFillColor: ORANGE_LIGHT }}>Nouveau contrat</span>
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
              className="dw-btn-primary"
              style={{ opacity: (!bTarget.trim() || !bAmount) ? 0.4 : 1 }}
            >
              {bPosting ? 'Publication…' : '🎯 Publier le contrat'}
            </button>
            <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.2)', textAlign: 'center' }}>
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
      <div className="phone" style={{ background: '#050302' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(232,117,44,0.15)' }}>
            <button className="icon-btn" onClick={() => setView('category')} style={{ color: ORANGE_LIGHT }}>←</button>
            <span className="app-header-title" style={{ color: ORANGE_LIGHT, WebkitTextFillColor: ORANGE_LIGHT }}>Détail</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, padding: '26px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 68, height: 68, borderRadius: 20, margin: '0 auto 16px',
                background: ORANGE_DIM, border: `1px solid rgba(232,117,44,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
              }}>{selectedItem.icon}</div>
              <p style={{ fontSize: 19, fontWeight: 800, color: '#f5f2ee', marginBottom: 8 }}>{selectedItem.name}</p>
              <p style={{ fontSize: 13, color: 'rgba(245,242,238,0.45)', lineHeight: 1.6 }}>{selectedItem.description}</p>
            </div>

            <div style={{
              background: ORANGE_DIM, border: '1px solid rgba(232,117,44,0.3)',
              borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.4)' }}>PRIX</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: ORANGE_LIGHT, fontFamily: "'Space Grotesk', monospace" }}>
                  ${selectedItem.price.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.4)' }}>SOLDE</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: balance >= selectedItem.price ? '#22c55e' : '#ef4444' }}>
                  ${balance.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => order(selectedItem)}
              disabled={ordering || balance < selectedItem.price}
              className="dw-btn-primary"
              style={{
                opacity: balance < selectedItem.price ? 0.4 : 1,
                cursor: balance < selectedItem.price ? 'not-allowed' : 'pointer',
              }}
            >
              {ordering ? 'Transaction…' : balance < selectedItem.price ? 'Fonds insuffisants' : 'Commander'}
            </button>
            <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.18)', textAlign: 'center' }}>
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
      <div className="phone" style={{ background: '#050302' }}>
        <div className="screen">
          <div className="app-header" style={{ borderColor: 'rgba(232,117,44,0.15)' }}>
            <button className="icon-btn" onClick={() => setView('home')} style={{ color: ORANGE_LIGHT }}>←</button>
            <span className="app-header-title" style={{ color: ORANGE_LIGHT, WebkitTextFillColor: ORANGE_LIGHT }}>{selectedCat.label}</span>
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
                {listings.map((item, i) => (
                  <div
                    key={item.id}
                    className="dw-row"
                    onClick={() => { setSelectedItem(item); setView('detail') }}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      animation: `dwFadeUp 0.3s ease ${i * 0.05}s both`,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      background: ORANGE_DIM, border: '1px solid rgba(232,117,44,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f2ee' }}>{item.name}</p>
                      <p style={{
                        fontSize: 11, color: 'rgba(245,242,238,0.35)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{item.description}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: ORANGE_LIGHT, fontFamily: "'Space Grotesk', monospace", flexShrink: 0 }}>
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
    <div className="phone" style={{ background: '#050302' }}>
      <div className="screen">
        <div className="app-header" style={{ borderColor: 'rgba(232,117,44,0.15)', background: 'rgba(5,3,2,0.9)' }}>
          <button className="icon-btn" onClick={onBack} style={{ color: ORANGE_LIGHT }}>←</button>
          <span style={{
            fontSize: 17, fontWeight: 800, letterSpacing: -0.3,
            color: '#f5f2ee',
          }}>🧅 The Hollow</span>
          <span style={{ width: 32 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', scrollbarWidth: 'none' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.id}
                className="dw-cat"
                onClick={() => openCategory(cat)}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: '16px 14px', cursor: 'pointer',
                  animation: `dwFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{cat.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f2ee', marginBottom: 2 }}>{cat.label}</p>
                <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.35)' }}>{cat.sub}</p>
              </div>
            ))}
          </div>

          <div
            className="dw-row"
            onClick={() => { setView('bounties'); fetchBounties() }}
            style={{
              background: `linear-gradient(135deg, ${ORANGE_DIM}, rgba(232,117,44,0.03))`,
              border: '1px solid rgba(232,117,44,0.3)',
              borderRadius: 16, padding: '18px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              animation: 'dwFadeUp 0.35s ease 0.3s both',
            }}
          >
            <div style={{ fontSize: 28 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#f5f2ee' }}>Tableau des contrats</p>
              <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.4)' }}>Têtes mises à prix</p>
            </div>
            <span style={{ color: ORANGE_LIGHT, fontSize: 18 }}>›</span>
          </div>

          <p style={{ fontSize: 9, color: 'rgba(245,242,238,0.15)', textAlign: 'center', marginTop: 26, letterSpacing: '0.04em' }}>
            The Hollow n'est ni responsable ni affilié à aucune transaction.
          </p>
        </div>

        {toast && <DarkToast msg={toast} />}
      </div>

      <style>{`
        @keyframes dwFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dw-cat, .dw-row {
          transition: transform 0.2s cubic-bezier(0.22,1,0.36,1), border-color 0.2s, background 0.2s;
        }
        .dw-cat:hover {
          transform: translateY(-3px);
          border-color: rgba(232,117,44,0.45) !important;
          background: rgba(232,117,44,0.06) !important;
        }
        .dw-cat:active {
          transform: translateY(-1px) scale(0.97);
        }
        .dw-row:hover {
          border-color: rgba(232,117,44,0.35) !important;
          background: rgba(232,117,44,0.04) !important;
        }
        .dw-row:active {
          transform: scale(0.98);
        }
        .dw-btn-primary {
          padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, ${ORANGE}, #c85f1e);
          color: #fff; font-size: 15px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          box-shadow: 0 6px 20px rgba(232,117,44,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .dw-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 26px rgba(232,117,44,0.4);
        }
        .dw-btn-primary:active {
          transform: translateY(0) scale(0.98);
        }
      `}</style>
    </div>
  )
}

function DarkToast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#1a1108', border: `1px solid ${ORANGE_DIM}`,
      borderRadius: 14, padding: '10px 18px',
      fontSize: 13, fontWeight: 700, color: '#f5f2ee',
      zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap',
    }}>{msg}</div>
  )
}
