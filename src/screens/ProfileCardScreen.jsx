import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

// Convertit les liens de page imgur.com en liens directs i.imgur.com
const fixImgur = url => url.replace('https://imgur.com/', 'https://i.imgur.com/')

const BACKGROUND_URL = fixImgur('https://imgur.com/96PHtUY.png')

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

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Bandeau identité (image de fond) ── */}
          <div style={{
            position: 'relative', width: '100%', height: 150,
            background: `url(${BACKGROUND_URL}) center/cover, #1a1a1a`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%)',
            }} />

            {/* Logo job en haut à droite */}
            <div
              onClick={() => editing && logoInputRef.current.click()}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 40, height: 40,
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
                width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.7)', flexShrink: 0,
                background: profile?.avatar_color ?? '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19, fontWeight: 800, color: '#fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.initials ?? '?'
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Oswald', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff',
                  lineHeight: 1.15, textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {profile?.username ?? 'Nom du Personnage'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
                  {job || 'Fonction'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                  {profile?.location || 'Quartier'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats en flux normal, sous l'image ── */}
          <div style={{ padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STAT_DEFS.map(def => (
              <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: def.color, border: '1.5px solid rgba(255,255,255,0.3)',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  <img src={def.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.04em' }}>
                      {def.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: def.color }}>{statValue(def.key)}</span>
                  </div>
                  <div style={{ width: '100%', height: 7, borderRadius: 5, background: 'var(--bg3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 5, width: `${statValue(def.key)}%`,
                      background: def.color, transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Édition ── */}
          {editing && (
            <div style={{ padding: '10px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Fonction / Job</label>
                <input value={job} onChange={e => setJob(e.target.value)} placeholder="ex: Barman au Sundown Strip" />
              </div>

              {STAT_DEFS.map(def => (
                <div key={def.key}>
                  <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Ajuste {def.label} avec le curseur ci-dessus.</p>
                  <input
                    type="range" min="0" max="100" value={statValue(def.key)}
                    onChange={e => updateStatValue(def.key, e.target.value)}
                    style={{ width: '100%', accentColor: def.color, marginTop: -12 }}
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
  )
}
