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
  const [editing, setEditing]   = useState(false)
  const [job, setJob]           = useState(profile?.job ?? '')
  const [stats, setStats]       = useState(() => {
    const saved = profile?.stats
    if (Array.isArray(saved) && saved[0]?.key) return saved
    return DEFAULT_STATS
  })
  const [saving, setSaving]       = useState(false)
  const [exporting, setExporting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
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

  // ── Export en image PNG ──
  async function exportCard() {
    setExporting(true)
    try {
      const W = 800, H = 480
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

      // Fond
      try {
        const bg = await loadImg(BACKGROUND_URL)
        const scale = Math.max(W / bg.width, H / bg.height)
        const dw = bg.width * scale, dh = bg.height * scale
        ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh)
      } catch {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, W, H)
      }

      // Voile sombre pour la lisibilité
      const overlay = ctx.createLinearGradient(0, 0, W, H * 0.7)
      overlay.addColorStop(0, 'rgba(0,0,0,0.55)')
      overlay.addColorStop(0.5, 'rgba(0,0,0,0.15)')
      overlay.addColorStop(1, 'rgba(0,0,0,0.05)')
      ctx.fillStyle = overlay
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, H * 0.6, W, H * 0.4)

      // Avatar haut gauche
      const avX = 90, avY = 110, avR = 70
      ctx.save()
      ctx.beginPath()
      ctx.arc(avX, avY, avR, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (profile?.avatar_url) {
        try {
          const img = await loadImg(profile.avatar_url)
          const scale = Math.max((avR*2) / img.width, (avR*2) / img.height)
          const dw = img.width * scale, dh = img.height * scale
          ctx.drawImage(img, avX - dw/2, avY - dh/2, dw, dh)
        } catch { drawAvatarFallback(ctx, avX, avY, avR*2, profile) }
      } else {
        drawAvatarFallback(ctx, avX, avY, avR*2, profile)
      }
      ctx.restore()
      ctx.beginPath()
      ctx.arc(avX, avY, avR, 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 3
      ctx.stroke()

      // Texte à droite de l'avatar
      const textX = avX + avR + 34
      ctx.textAlign = 'left'
      ctx.fillStyle = '#ffffff'
      ctx.font = "800 44px 'Oswald', sans-serif"
      ctx.fillText(profile?.username ?? 'Nom du Personnage', textX, 76)
      ctx.font = "600 26px 'Oswald', sans-serif"
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(job || 'Fonction', textX, 112)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(profile?.location || 'Quartier', textX, 146)

      // Logo du job/entreprise en haut à droite
      if (profile?.job_logo_url) {
        try {
          const logo = await loadImg(profile.job_logo_url)
          const lw = 110
          const lh = (logo.height / logo.width) * lw
          ctx.save()
          ctx.globalAlpha = 0.95
          ctx.drawImage(logo, W - lw - 30, 24, lw, lh)
          ctx.restore()
        } catch {}
      }

      // Badges de stats, colonne gauche
      let by = 230
      for (const def of STAT_DEFS) {
        const val = statValue(def.key)
        const bx = 70

        // Icône ronde
        ctx.save()
        ctx.beginPath()
        ctx.arc(bx, by, 28, 0, Math.PI * 2)
        ctx.fillStyle = def.color
        ctx.fill()
        try {
          const icon = await loadImg(def.icon)
          ctx.beginPath()
          ctx.arc(bx, by, 25, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(icon, bx - 25, by - 25, 50, 50)
        } catch {}
        ctx.restore()
        ctx.beginPath()
        ctx.arc(bx, by, 28, 0, Math.PI*2)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 2
        ctx.stroke()

        // Barre à droite de l'icône
        const barX = bx + 46
        const barW = 220
        const barH = 12
        ctx.font = "600 14px 'Oswald', sans-serif"
        ctx.fillStyle = '#fff'
        ctx.fillText(`${def.label.toUpperCase()}  ${val}`, barX, by - 10)

        roundRectPath(ctx, barX, by - 2, barW, barH, 6)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fill()
        const fillW = Math.max(4, (barW * val) / 100)
        roundRectPath(ctx, barX, by - 2, fillW, barH, 6)
        ctx.fillStyle = def.color
        ctx.fill()

        by += 58
      }

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(profile?.username ?? 'personnage').replace(/\s+/g, '_')}_fiche.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (e) {
      console.error('Erreur export:', e)
    }
    setExporting(false)
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Aperçu de la carte ── */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '800/480',
            borderRadius: 16, overflow: 'hidden',
            background: `url(${BACKGROUND_URL}) center/cover, #1a1a1a`,
            border: '1px solid var(--border)',
          }}>
            {/* voile */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.4) 100%)',
            }} />

            {/* Logo job en haut à droite */}
            <div
              onClick={() => editing && logoInputRef.current.click()}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 46, height: 46,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: editing ? 'pointer' : 'default',
                border: editing ? '1.5px dashed rgba(255,255,255,0.4)' : 'none',
                borderRadius: 10,
                background: editing ? 'rgba(0,0,0,0.3)' : 'transparent',
              }}
            >
              {profile?.job_logo_url
                ? <img src={profile.job_logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : editing && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{uploadingLogo ? '…' : '+ logo'}</span>
              }
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />

            {/* Avatar + texte */}
            <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.6)', flexShrink: 0,
                background: profile?.avatar_color ?? '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.initials ?? '?'
                }
              </div>
              <div>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 800, fontSize: 17, color: '#fff', lineHeight: 1.15 }}>
                  {profile?.username ?? 'Nom du Personnage'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                  {job || 'Fonction'}
                </p>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                  {profile?.location || 'Quartier'}
                </p>
              </div>
            </div>

            {/* Badges de stats */}
            <div style={{ position: 'absolute', left: 12, top: 88, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAT_DEFS.map(def => (
                <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: def.color, border: '1.5px solid rgba(255,255,255,0.5)',
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img src={def.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ width: 90 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, fontWeight: 700, color: '#fff' }}>{def.label.toUpperCase()}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: def.color }}>{statValue(def.key)}</span>
                    </div>
                    <div style={{ width: '100%', height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${statValue(def.key)}%`, background: def.color, borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!editing ? (
            <button
              onClick={exportCard}
              disabled={exporting}
              style={{
                padding: '13px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 24px rgba(185,110,255,0.3)',
              }}
            >
              {exporting ? 'Génération…' : '📥 Exporter en image'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
  )
}

function drawAvatarFallback(ctx, x, y, size, profile) {
  ctx.fillStyle = profile?.avatar_color ?? '#7c3aed'
  ctx.fillRect(x - size/2, y - size/2, size, size)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${size * 0.36}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(profile?.initials ?? '?', x, y)
  ctx.textBaseline = 'alphabetic'
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
