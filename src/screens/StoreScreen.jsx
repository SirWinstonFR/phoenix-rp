import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function StoreScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [phones, setPhones]         = useState([])
  const [myPhones, setMyPhones]     = useState([])
  const [activePhone, setActivePhone] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('store') // 'store' | 'inventory' | 'detail'
  const [selected, setSelected]     = useState(null)
  const [buying, setBuying]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [filter, setFilter]         = useState('all') // 'all' | 'new' | 'used'

  useEffect(() => {
    fetchPhones()
    fetchMyPhones()
  }, [])

  async function fetchPhones() {
    const { data } = await supabase
      .from('phone_models')
      .select('*')
      .eq('available', true)
      .order('price', { ascending: true })
    setPhones(data ?? [])
    setLoading(false)
  }

  async function fetchMyPhones() {
    const { data } = await supabase
      .from('player_phones')
      .select('*, phone_models(*)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })
    setMyPhones(data ?? [])
    setActivePhone(data?.find(p => p.is_active)?.phone_models ?? null)
  }

  async function buyPhone(phone) {
    setBuying(true)
    try {
      // Vérifier si déjà possédé
      const already = myPhones.find(p => p.phone_model_id === phone.id)
      if (already) {
        showToast('❌ Tu possèdes déjà ce téléphone !')
        setBuying(false)
        return
      }

      // Vérifier le solde (quand la banque sera là)
      // Pour l'instant on vérifie juste le profil
      const balance = profile?.balance ?? 0
      if (balance < phone.price) {
        showToast(`❌ Solde insuffisant ! Il te faut $${phone.price.toLocaleString()}`)
        setBuying(false)
        return
      }

      // Déduire le prix
      await updateProfile({ balance: balance - phone.price })

      // Ajouter le téléphone
      await supabase.from('player_phones').insert({
        user_id:        user.id,
        phone_model_id: phone.id,
        is_active:      false,
      })

      await fetchMyPhones()
      showToast(`✅ ${phone.name} acheté !`)
      setView('inventory')
    } catch (e) {
      showToast('❌ Erreur lors de l\'achat')
    }
    setBuying(false)
  }

  async function equipPhone(playerPhone) {
    // Désactiver tous les téléphones
    await supabase.from('player_phones')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Activer celui-ci
    await supabase.from('player_phones')
      .update({ is_active: true })
      .eq('id', playerPhone.id)

    // Sauvegarder le thème dans le profil
    await updateProfile({
      active_phone_id: playerPhone.phone_model_id,
      phone_theme: {
        color:         playerPhone.phone_models.theme_color,
        bg:            playerPhone.phone_models.theme_bg,
        border_radius: playerPhone.phone_models.border_radius,
        notch_style:   playerPhone.phone_models.notch_style,
        font_style:    playerPhone.phone_models.font_style,
        shell:         playerPhone.phone_models.shell_color ?? '#0c0c0c',
        frame_style:   playerPhone.phone_models.frame_style ?? 'modern',
      }
    })

    await fetchMyPhones()
    showToast(`📱 ${playerPhone.phone_models.name} activé !`)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const balance = profile?.balance ?? 0
  const filtered = filter === 'all' ? phones : phones.filter(p => p.condition === filter)

  // ── VUE INVENTAIRE ──
  if (view === 'inventory') return (
    <div className="phone">
      <StatusBar />
      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={() => setView('store')}>←</button>
          <span className="app-header-title">Mes téléphones</span>
          <span style={{ width: 32 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {myPhones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <p className="empty-title">Aucun téléphone</p>
              <p className="empty-sub">Achète ton premier téléphone dans le store !</p>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myPhones.map(p => {
                const m = p.phone_models
                return (
                  <div key={p.id} style={{
                    background: p.is_active ? `${m.theme_color}15` : 'var(--bg2)',
                    border: `1px solid ${p.is_active ? m.theme_color + '44' : 'var(--border)'}`,
                    borderRadius: 16, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {/* Miniature téléphone */}
                    <PhoneThumb phone={m} small />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{m.name}</p>
                        {p.is_active && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                            background: `${m.theme_color}22`, color: m.theme_color,
                            border: `1px solid ${m.theme_color}44`,
                          }}>ACTIF</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>{m.brand} · {m.storage} · {m.camera}</p>
                    </div>

                    {!p.is_active && (
                      <button onClick={() => equipPhone(p)} style={{
                        padding: '7px 12px', borderRadius: 10, border: 'none',
                        background: `${m.theme_color}22`,
                        border: `1px solid ${m.theme_color}44`,
                        color: m.theme_color, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                      }}>Équiper</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {toast && <Toast msg={toast} />}
      </div>
    </div>
  )

  // ── VUE DÉTAIL ──
  if (view === 'detail' && selected) {
    const owned = myPhones.find(p => p.phone_model_id === selected.id)
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen" style={{ background: selected.theme_bg }}>
          <div className="app-header" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
            <button className="icon-btn" onClick={() => setView('store')}>←</button>
            <span className="app-header-title" style={{ color: selected.theme_color }}>{selected.name}</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>

            {/* Préview téléphone */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{
                width: 120, height: 220,
                background: selected.theme_bg,
                borderRadius: selected.border_radius / 2,
                border: `2px solid ${selected.theme_color}66`,
                boxShadow: `0 0 40px ${selected.theme_color}33, 0 20px 40px rgba(0,0,0,0.6)`,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Encoche */}
                {selected.notch_style === 'pill' && (
                  <div style={{
                    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                    width: 50, height: 12, background: '#000', borderRadius: 10, zIndex: 10,
                  }} />
                )}
                {selected.notch_style === 'hole' && (
                  <div style={{
                    position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                    width: 10, height: 10, background: '#000', borderRadius: '50%', zIndex: 10,
                  }} />
                )}
                {selected.notch_style === 'wide' && (
                  <div style={{
                    height: 20, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} />
                )}

                {/* Écran */}
                <div style={{
                  flex: 1, margin: selected.notch_style === 'none' ? 4 : '18px 4px 4px',
                  background: `linear-gradient(135deg, ${selected.theme_color}22, ${selected.theme_bg})`,
                  borderRadius: selected.border_radius / 3,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <div style={{ fontSize: 24, background: `linear-gradient(135deg, ${selected.theme_color}, #fff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    12:00
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginTop: 8 }}>
                    {['💬','📞','📷','🗺️','💘','🪪'].map((icon, i) => (
                      <div key={i} style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: `${selected.theme_color}22`,
                        border: `1px solid ${selected.theme_color}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9,
                      }}>{icon}</div>
                    ))}
                  </div>
                </div>

                {/* Bouton home */}
                {selected.notch_style !== 'none' && (
                  <div style={{
                    height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 30, height: 3, borderRadius: 2, background: `${selected.theme_color}44` }} />
                  </div>
                )}
              </div>
            </div>

            {/* Infos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{selected.name}</p>
                <p style={{ fontSize: 13, color: selected.theme_color, fontWeight: 600 }}>{selected.brand}</p>
              </div>

              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{selected.description}</p>

              {/* Specs */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                {[
                  { label: '💾 Stockage', value: selected.storage },
                  { label: '📸 Caméra',   value: selected.camera },
                  { label: '🔋 Batterie', value: selected.battery },
                  { label: '📦 État',     value: selected.condition === 'new' ? 'Neuf' : selected.condition === 'used' ? 'Occasion' : 'Reconditionné' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selected.theme_color}22`,
                    borderRadius: 12, padding: '10px 12px',
                  }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{s.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Prix */}
              <div style={{
                background: `${selected.theme_color}15`,
                border: `1px solid ${selected.theme_color}33`,
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Prix</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: selected.theme_color }}>
                    ${selected.price.toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Ton solde</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: balance >= selected.price ? '#22c55e' : '#ef4444' }}>
                    ${balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {owned ? (
                <div style={{
                  padding: '14px', borderRadius: 14, textAlign: 'center',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                  color: '#22c55e', fontSize: 14, fontWeight: 700,
                }}>
                  ✓ Déjà dans ton inventaire
                </div>
              ) : (
                <button
                  onClick={() => buyPhone(selected)}
                  disabled={buying || balance < selected.price}
                  style={{
                    padding: '14px', borderRadius: 14, border: 'none',
                    background: balance >= selected.price
                      ? `linear-gradient(135deg, ${selected.theme_color}, ${selected.theme_color}aa)`
                      : 'rgba(255,255,255,0.06)',
                    color: balance >= selected.price ? '#fff' : '#555',
                    fontSize: 15, fontWeight: 800, cursor: balance >= selected.price ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    boxShadow: balance >= selected.price ? `0 8px 24px ${selected.theme_color}44` : 'none',
                  }}
                >
                  {buying ? 'Achat en cours…' : balance < selected.price ? 'Solde insuffisant' : `Acheter · $${selected.price.toLocaleString()}`}
                </button>
              )}
            </div>
          </div>
          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

  // ── VUE STORE ──
  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">📱 Store</span>
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setView('inventory')}>
            🎒
            {myPhones.length > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                fontSize: 8, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg)',
              }}>{myPhones.length}</span>
            )}
          </button>
        </div>

        {/* Solde */}
        <div style={{
          margin: '0 14px 10px', padding: '10px 14px',
          background: 'var(--glass)', border: '1px solid var(--border)',
          borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 2 }}>TON SOLDE</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>${balance.toLocaleString()}</p>
          </div>
          {activePhone && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 2 }}>TÉLÉPHONE ACTIF</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: activePhone.theme_color }}>{activePhone.name}</p>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px' }}>
          {[['all','Tous'],['new','Neuf'],['used','Occasion']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: filter === val ? 'var(--accent)' : 'var(--glass)',
              color: filter === val ? '#fff' : 'var(--t3)',
              border: filter === val ? 'none' : '1px solid var(--border)',
            }}>{label}</button>
          ))}
        </div>

        {/* Liste */}
        <div className="feed" style={{ flex: 1, padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : filtered.map((phone, i) => {
            const owned = myPhones.find(p => p.phone_model_id === phone.id)
            const isActive = myPhones.find(p => p.phone_model_id === phone.id && p.is_active)

            return (
              <div
                key={phone.id}
                onClick={() => { setSelected(phone); setView('detail') }}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 18, padding: '12px 14px',
                  cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
                  transition: 'transform 0.15s, border-color 0.15s',
                  animation: `postIn 0.3s ease ${i * 0.04}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = phone.theme_color + '66'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Miniature */}
                <PhoneThumb phone={phone} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{phone.name}</p>
                    {isActive && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: `${phone.theme_color}22`, color: phone.theme_color, border: `1px solid ${phone.theme_color}44` }}>
                        ACTIF
                      </span>
                    )}
                    {owned && !isActive && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{phone.brand} · {phone.storage} · {phone.camera}</p>
                  <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {phone.description}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: phone.theme_color }}>
                    ${phone.price.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 9, color: phone.condition === 'new' ? '#22c55e' : '#f59e0b', marginTop: 2, fontWeight: 600 }}>
                    {phone.condition === 'new' ? 'NEUF' : 'OCCASION'}
                  </p>
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

function Toast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '10px 18px',
      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
      zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap', animation: 'fadeDown 0.2s ease',
    }}>{msg}</div>
  )
}

// Miniature qui reflète vraiment le style du modèle (frame_style, notch, couleur)
function PhoneThumb({ phone, small }) {
  const w = small ? 40 : 46
  const h = small ? 62 : 72
  const frame = phone.frame_style ?? 'modern'

  return (
    <div style={{
      width: w, height: h, flexShrink: 0, position: 'relative',
      borderRadius: Math.max(6, phone.border_radius / 4),
      background: phone.theme_bg,
      border: `${frame === 'rugged' || frame === 'chunky' ? 3 : 2}px solid ${
        frame === 'rugged' ? '#888' : frame === 'chunky' ? '#333' : phone.theme_color + '77'
      }`,
      boxShadow: `0 4px 14px ${phone.theme_color}33, inset 0 0 12px ${phone.theme_color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Écran interne coloré */}
      <div style={{
        position: 'absolute', inset: 3,
        borderRadius: Math.max(3, phone.border_radius / 6),
        background: `linear-gradient(160deg, ${phone.theme_color}33, transparent 60%)`,
      }} />

      {/* Encoche selon le style */}
      {frame === 'modern' && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          width: w * 0.4, height: 4, borderRadius: 3, background: '#000',
        }} />
      )}
      {frame === 'curved' && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          width: 4, height: 4, borderRadius: '50%', background: '#000',
        }} />
      )}
      {frame === 'foldable' && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5,
          background: 'rgba(0,0,0,0.4)', transform: 'translateX(-50%)',
        }} />
      )}
      {frame === 'chunky' && (
        <div style={{
          position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
          width: 3, height: 6, background: '#222', borderRadius: '2px 2px 0 0',
        }} />
      )}
      {frame === 'rugged' && (
        <>
          {['4px','4px'].map((_, i) => null)}
          <div style={{ position: 'absolute', top: 2, left: 2, width: 3, height: 3, borderRadius: '50%', background: '#aaa' }} />
          <div style={{ position: 'absolute', top: 2, right: 2, width: 3, height: 3, borderRadius: '50%', background: '#aaa' }} />
          <div style={{ position: 'absolute', bottom: 2, left: 2, width: 3, height: 3, borderRadius: '50%', background: '#aaa' }} />
          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 3, height: 3, borderRadius: '50%', background: '#aaa' }} />
        </>
      )}

      {/* Bosse caméra modern */}
      {frame === 'modern' && (
        <div style={{
          position: 'absolute', top: 8, left: 6,
          width: 6, height: 6, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #555, #111)',
        }} />
      )}

      {/* Icône centrale = première lettre de la marque, colorée */}
      <p style={{
        fontSize: small ? 13 : 16, fontWeight: 900,
        color: phone.theme_color, zIndex: 2,
        textShadow: `0 0 8px ${phone.theme_color}66`,
      }}>
        {phone.brand?.[0] ?? '?'}
      </p>
    </div>
  )
}
