import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

// Convertit les liens de page imgur.com en liens directs i.imgur.com
const fixImgur = url => url.replace('https://imgur.com/', 'https://i.imgur.com/')

const BACKGROUND_URL = fixImgur('https://imgur.com/96PHtUY.png')

// Dimensions "réelles" de la carte — identiques à l'image générée par le bot
const CARD_W = 800
const CARD_H = 460

// Les 4 catégories fixes, dans l'ordre demandé
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

  // ── Mise à l'échelle automatique de la carte (garde toutes les proportions) ──
  const wrapperRef = useRef(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / CARD_W)
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function statValue(key) {
    return stats.find(s => s.key === key)?.value ?? 50
  }

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

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

          {/* ── Conteneur mis à l'échelle — tout garde ses proportions ── */}
          <div
            ref={wrapperRef}
            style={{ width: '100%', height: CARD_H * scale, position: 'relative', overflow: 'hidden', borderRadius: 16 }}
          >
            <div style={{
              width: CARD_W, height: CARD_H,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              position: 'relative',
              background: `url(${BACKGROUND_URL}) center/cover, #1a1a1a`,
              borderRadius: 16 / scale,
              overflow: 'hidden',
            }}>
              {/* Voile sombre */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.5) 100%)',
              }} />

              {/* Logo emploi en haut à droite */}
              <div
                onClick={() => editing && logoInputRef.current.click()}
                style={{
                  position: 'absolute', top: 24, right: 30,
                  width: 110, height: 60,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: editing ? 'pointer' : 'default',
                  border: editing ? '2px dashed rgba(255,255,255,0.4)' : 'none',
                  borderRadius: 12,
                  background: editing ? 'rgba(0,0,0,0.3)' : 'transparent',
                  zIndex: 2,
                }}
              >
                {profile?.job_logo_url
                  ? <img src={profile.job_logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : editing && <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>{uploadingLogo ? '…' : '+ logo'}</span>
                }
              </div>

              {/* Avatar */}
              <div style={{
                position: 'absolute', left: 20, top: 40,
                width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(255,255,255,0.6)',
                background: profile?.avatar_color ?? '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontWeight: 800, color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.initials ?? '?'
                }
              </div>

              {/* Texte à droite de l'avatar */}
              <div style={{ position: 'absolute', left: 194, top: 46 }}>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 800, fontSize: 44, color: '#fff', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
                  {profile?.username ?? 'Nom du Personnage'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
                  {job || 'Fonction'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                  {profile?.location || 'Quartier'}
                </p>
              </div>

              {/* Badges de stats — colonne gauche */}
              <div style={{ position: 'absolute', left: 40, top: 230, display: 'flex', flexDirection: 'column', gap: 30 }}>
                {STAT_DEFS.map(def => (
                  <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: def.color, border: '2px solid rgba(255,255,255,0.5)',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      <img src={def.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ width: 220 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                          {def.label.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: def.color }}>{statValue(def.key)}</span>
                      </div>
                      <div style={{ width: '100%', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 6, width: `${statValue(def.key)}%`,
                          background: def.color, transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <p style={{
                position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
                fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em',
              }}>
                PHOENIX RP · FICHE PERSONNAGE
              </p>
            </div>

            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>

          {/* ── Édition ── */}
          {editing && (
            <div style={{ padding: '18px 4px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          {!editing && (
            <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 12 }}>
              Tape <b>!fiche</b> sur Discord pour recevoir cette carte en image haute résolution.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
