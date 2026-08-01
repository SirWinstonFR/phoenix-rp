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
          alignItems: 'center', justifyContent: 'center',
          padding: 16, fontFamily: "'Courier New', monospace",
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Scanlines + bruit de fond */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'repeating-linear-gradient(0deg, rgba(232,117,44,0.02) 0px, transparent 1px, transparent 3px)',
          }} />
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 320, height: 320, borderRadius: '50%',
            background: `radial-gradient(circle, ${ORANGE_DIM} 0%, transparent 70%)`,
            pointerEvents: 'none', animation: 'gatePulse 3.5s ease-in-out infinite', zIndex: 0,
          }} />

          <button onClick={onBack} style={{
            position: 'absolute', top: 12, left: 12,
            background: 'none', border: 'none', color: 'rgba(232,117,44,0.4)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', zIndex: 3,
          }}>← quitter</button>

          {/* ── Fenêtre terminal ── */}
          <div style={{
            width: '100%', maxWidth: 300, position: 'relative', zIndex: 2,
            background: 'rgba(8,5,3,0.92)', borderRadius: 10,
            border: '1px solid rgba(232,117,44,0.25)',
            boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${ORANGE_DIM}`,
            overflow: 'hidden',
            animation: error ? 'shakeGate 0.4s ease' : 'none',
          }}>
            {/* Barre de titre */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderBottom: '1px solid rgba(232,117,44,0.15)',
              background: 'rgba(232,117,44,0.04)',
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <p style={{ fontSize: 8, color: 'rgba(245,160,82,0.5)', letterSpacing: '0.02em' }}>
                thehollow@access:~ — zsh
              </p>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 7, fontWeight: 800, color: '#f5a052',
                background: 'rgba(232,117,44,0.12)', border: '1px solid rgba(232,117,44,0.3)',
                borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em',
              }}>
                <span className="gate-blink" style={{ width: 4, height: 4, borderRadius: '50%', background: '#f5a052', display: 'inline-block' }} />
                LIVE
              </span>
            </div>

            {/* Corps du terminal */}
            <div style={{ padding: '14px 14px 16px', fontSize: 10 }}>
              <p style={{ color: '#4a3020', marginBottom: 6 }}>
                <span style={{ color: '#f5a052' }}>thehollow</span>@access:~ $ sys status
              </p>
              <div style={{ color: 'rgba(232,117,44,0.5)', marginBottom: 12, lineHeight: 1.7 }}>
                <p>&gt; NET.MASQUER........... <span style={{ color: '#4ade80' }}>[ OK ]</span></p>
                <p>&gt; TUNNEL.CHIFFRÉ.......... <span style={{ color: '#4ade80' }}>[ OK ]</span></p>
                <p>&gt; TRACE.SUPPRIMÉE......... <span style={{ color: '#4ade80' }}>[ OK ]</span></p>
              </div>

              <p style={{ color: '#4a3020', marginBottom: 8 }}>
                <span style={{ color: '#f5a052' }}>thehollow</span>@access:~ $ cat /access.msg
              </p>

              <p style={{
                fontSize: 19, fontWeight: 800, color: '#f5f2ee', lineHeight: 1.25,
                marginBottom: 10, letterSpacing: '-0.01em',
              }}>
                ACCÈS <span style={{ color: ORANGE_LIGHT, textShadow: `0 0 14px ${ORANGE}` }}>RESTREINT</span>.<span className="gate-cursor">_</span>
              </p>

              <p style={{ color: 'rgba(245,242,238,0.4)', fontSize: 9.5, lineHeight: 1.6, marginBottom: 14 }}>
                &gt; Réseau non répertorié.<br />
                &gt; Clef d'accès requise.
              </p>

              <p style={{ color: '#4a3020', marginBottom: 8 }}>
                <span style={{ color: '#f5a052' }}>thehollow</span>@access:~ $ authenticate --key
              </p>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(232,117,44,0.05)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(232,117,44,0.25)'}`,
                borderRadius: 6, padding: '9px 10px', marginBottom: 10,
                transition: 'border-color 0.2s',
              }}>
                <span style={{ color: ORANGE }}>$</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkPassword()}
                  placeholder="clef_d_accès"
                  autoFocus
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: ORANGE_LIGHT, fontSize: 12, fontFamily: "'Courier New', monospace",
                    letterSpacing: '0.05em',
                  }}
                />
                <button
                  onClick={checkPassword}
                  disabled={checking || !password}
                  style={{
                    padding: '5px 12px', borderRadius: 4, border: 'none',
                    background: password ? ORANGE : 'rgba(255,255,255,0.06)',
                    color: password ? '#000' : '#555', fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.04em', cursor: password ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  {checking ? '…' : 'ENTRER →'}
                </button>
              </div>

              {error ? (
                <p style={{ fontSize: 9, color: '#ef4444', letterSpacing: '0.05em' }}>
                  [ ERREUR ] Clef invalide — accès refusé.
                </p>
              ) : (
                <p style={{ fontSize: 8, color: 'rgba(245,160,82,0.3)', letterSpacing: '0.03em' }}>
                  [OK] AUCUNE.TRACE.ENREGISTRÉE · SESSION.ANONYME
                </p>
              )}
            </div>

            {/* Barre de statut */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 12px', borderTop: '1px solid rgba(232,117,44,0.12)',
              background: 'rgba(0,0,0,0.3)', fontSize: 7, color: 'rgba(245,160,82,0.4)',
              letterSpacing: '0.03em',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🧅 THE HOLLOW
              </span>
              <span>NŒUD #{Math.random().toString(16).slice(2, 6).toUpperCase()}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                CHIFFRÉ
              </span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shakeGate {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
          @keyframes gatePulse {
            0%, 100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
            50%      { opacity: 0.9; transform: translate(-50%,-50%) scale(1.08); }
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
