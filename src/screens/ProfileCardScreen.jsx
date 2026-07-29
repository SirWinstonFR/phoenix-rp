import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

const fixImgur = url => url.replace('https://imgur.com/', 'https://i.imgur.com/')
const BACKGROUND_URL = fixImgur('https://imgur.com/96PHtUY.png')

const STAT_DEFS = [
  { key: 'richesse',  label: 'Richesse',  icon: fixImgur('https://imgur.com/8ymiCIF.png'), color: '#f5c344' },
  { key: 'legalite',  label: 'Légalité',  icon: fixImgur('https://imgur.com/8sOK8Tg.png'), color: '#e0a94a' },
  { key: 'social',    label: 'Social',    icon: fixImgur('https://imgur.com/RG2khwT.png'), color: '#e0568f' },
  { key: 'ascension', label: 'Ascension', icon: fixImgur('https://imgur.com/uJIB6A4.png'), color: '#4a90d9' },
]

const DEFAULT_STATS = STAT_DEFS.map(s => ({ key: s.key, value: 50 }))

export default function ProfileCardScreen({ onBack }) {
  const { profile, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [job, setJob]         = useState(profile?.job ?? '')
  const [stats, setStats]     = useState(() => {
    const saved = profile?.stats
    if (Array.isArray(saved) && saved[0]?.key) return saved
    return DEFAULT_STATS
  })
  const [saving, setSaving]               = useState(false)
  const [uploadingLogo, setUploadingLogo]  = useState(false)
  const logoInputRef = useRef()

  function statValue(key) {
    return stats.find(s => s.key === key)?.value ?? 50
  }

  const influenceTarget = STAT_DEFS.reduce((sum, def) => sum + statValue(def.key), 0) / STAT_DEFS.length / 10

  // Animation "compteur" du score d'influence
  const [animatedInfluence, setAnimatedInfluence] = useState(0)
  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 700
    const from = 0
    const to = influenceTarget
    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setAnimatedInfluence(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [influenceTarget])

  function updateStatValue(key, value) {
    setStats(prev => prev.map(s => s.key === key ? { ...s, value: Number(value) } : s))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ job: job.trim(), stats })
      setEditing(false)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `job-logos/${profile.id}.${ext}`
      await supabase.storage.from('post-images').upload(path, file, { upsert: true })
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await updateProfile({ job_logo_url: url })
    } catch (err) {
      console.error(err)
    }
    setUploadingLogo(false)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: 'var(--bg)' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Résumé personnage</span>
          <button className="icon-btn" onClick={() => setEditing(e => !e)}>
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        <div className="pc-scroll" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Bannière ── */}
          <div style={{
            position: 'relative', width: '100%', height: 160,
            background: `url(${BACKGROUND_URL}) center/cover, #1a1a1a`,
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%)',
            }} />

            {/* Logo emploi, discret en haut à droite */}
            <div
              onClick={() => editing && logoInputRef.current.click()}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: editing ? 'pointer' : 'default',
                border: editing ? '1.5px dashed rgba(255,255,255,0.4)' : 'none',
                borderRadius: 10,
                background: editing ? 'rgba(0,0,0,0.35)' : 'transparent',
                zIndex: 2,
              }}
            >
              {profile?.job_logo_url
                ? <img src={profile.job_logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : editing && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{uploadingLogo ? '…' : '+ logo'}</span>
              }
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />

            {/* Avatar + texte */}
            <div style={{
              position: 'absolute', bottom: 14, left: 14, right: 60,
              display: 'flex', alignItems: 'center', gap: 12, zIndex: 1,
            }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.7)', flexShrink: 0,
                background: profile?.avatar_color ?? '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.initials ?? '?'
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Oswald', sans-serif", fontWeight: 800, fontSize: 19, color: '#fff',
                  lineHeight: 1.15, textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {profile?.username ?? 'Nom du Personnage'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
                  {job || 'Fonction'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                  {profile?.location || 'Quartier'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Zone stats — design natif animé ── */}
          <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Carte Influence Totale */}
            <div style={{
              position: 'relative', borderRadius: 20, padding: '18px 20px',
              background: 'linear-gradient(135deg, rgba(185,110,255,0.12), rgba(123,159,255,0.05))',
              border: '1px solid rgba(185,110,255,0.25)',
              overflow: 'hidden',
              animation: 'cardFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(185,110,255,0.2), transparent 70%)',
              }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', position: 'relative' }}>
                INFLUENCE TOTALE
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6, position: 'relative' }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk', monospace", letterSpacing: -1 }}>
                  {animatedInfluence.toFixed(1)}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t3)' }}>/10</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, lineHeight: 1.5, position: 'relative' }}>
                Moyenne des 4 valeurs (25% chacune), ramenée sur 10.
              </p>
            </div>

            {/* Les 4 stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {STAT_DEFS.map((def, i) => (
                <div key={def.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  animation: `cardFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.08}s both`,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: def.color, border: '2px solid rgba(255,255,255,0.15)',
                    overflow: 'hidden', flexShrink: 0,
                    boxShadow: `0 4px 14px ${def.color}44`,
                  }}>
                    <img src={def.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.03em' }}>
                        {def.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: def.color }}>{statValue(def.key)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {Array.from({ length: 10 }).map((_, blockI) => (
                        <div
                          key={blockI}
                          style={{
                            flex: 1, height: 9, borderRadius: 3,
                            background: blockI < Math.round(statValue(def.key) / 10) ? def.color : 'var(--bg3)',
                            animation: `blockPop 0.3s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.08 + blockI * 0.025}s both`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!editing && (
              <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 4 }}>
                Tape <b>!fiche</b> sur Discord pour recevoir cette carte en image.
              </p>
            )}

            {/* ── Édition ── */}
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                <div className="form-group">
                  <label>Fonction / Job</label>
                  <input value={job} onChange={e => setJob(e.target.value)} placeholder="ex: Barman au Sundown Strip" />
                </div>

                {STAT_DEFS.map(def => (
                  <div key={def.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <img src={def.icon} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>{def.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: def.color }}>{statValue(def.key)}</span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={statValue(def.key)}
                      onChange={e => updateStatValue(def.key, e.target.value)}
                      style={{ width: '100%', accentColor: def.color }}
                    />
                  </div>
                ))}

                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pc-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .pc-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blockPop {
          from { opacity: 0; transform: scaleY(0.3); }
          to   { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
