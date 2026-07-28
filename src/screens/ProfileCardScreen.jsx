import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

const DEFAULT_STATS = [
  { label: 'Force',       value: 50 },
  { label: 'Charisme',    value: 50 },
  { label: 'Discrétion',  value: 50 },
  { label: 'Richesse',    value: 50 },
]

export default function ProfileCardScreen({ onBack }) {
  const { profile, updateProfile } = useAuth()
  const [editing, setEditing]   = useState(false)
  const [job, setJob]           = useState(profile?.job ?? '')
  const [stats, setStats]       = useState(profile?.stats ?? DEFAULT_STATS)
  const [saving, setSaving]     = useState(false)
  const [exporting, setExporting] = useState(false)
  const [animKey, setAnimKey]   = useState(0) // relance l'animation des barres
  const cardRef = useRef(null)

  useEffect(() => {
    // Relance l'animation d'entrée des barres à chaque ouverture
    const t = setTimeout(() => setAnimKey(k => k + 1), 50)
    return () => clearTimeout(t)
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ job: job.trim(), stats })
      setEditing(false)
      setAnimKey(k => k + 1)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  function updateStatValue(i, value) {
    setStats(prev => prev.map((s, idx) => idx === i ? { ...s, value: Number(value) } : s))
  }

  function updateStatLabel(i, label) {
    setStats(prev => prev.map((s, idx) => idx === i ? { ...s, label } : s))
  }

  // ── Export en image PNG via canvas ──
  async function exportCard() {
    setExporting(true)
    try {
      const W = 600, H = 800
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

      // Fond dégradé
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#12081c')
      bg.addColorStop(1, '#050208')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Halo décoratif
      const glow = ctx.createRadialGradient(W / 2, 140, 20, W / 2, 140, 260)
      glow.addColorStop(0, 'rgba(185,110,255,0.25)')
      glow.addColorStop(1, 'rgba(185,110,255,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, 400)

      // Avatar (cercle)
      const avatarSize = 160
      const avatarX = W / 2
      const avatarY = 190
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      if (profile?.avatar_url) {
        try {
          const img = await loadImageCrossOrigin(profile.avatar_url)
          const scale = Math.max(avatarSize / img.width, avatarSize / img.height)
          const dw = img.width * scale, dh = img.height * scale
          ctx.drawImage(img, avatarX - dw / 2, avatarY - dh / 2, dw, dh)
        } catch {
          drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, profile)
        }
      } else {
        drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, profile)
      }
      ctx.restore()

      // Anneau dégradé autour de l'avatar
      const ringGrad = ctx.createLinearGradient(avatarX - avatarSize/2, avatarY - avatarSize/2, avatarX + avatarSize/2, avatarY + avatarSize/2)
      ringGrad.addColorStop(0, '#b96eff')
      ringGrad.addColorStop(1, '#7b9fff')
      ctx.beginPath()
      ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2)
      ctx.strokeStyle = ringGrad
      ctx.lineWidth = 5
      ctx.stroke()

      // Nom
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 38px sans-serif'
      ctx.fillText(profile?.username ?? 'Inconnu', W / 2, 320)

      // Job
      if (job) {
        ctx.font = '600 20px sans-serif'
        ctx.fillStyle = '#c9a6ff'
        ctx.fillText(job, W / 2, 352)
      }

      // Quartier / lieu
      if (profile?.location) {
        ctx.font = '15px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fillText(`📍 ${profile.location}`, W / 2, 380)
      }

      ctx.textAlign = 'left'

      // Barres de stats
      const barX = 60
      const barW = W - 120
      const barH = 16
      let barY = 440
      const barGap = 74

      stats.forEach((stat, i) => {
        // Label + valeur
        ctx.font = 'bold 15px sans-serif'
        ctx.fillStyle = '#fff'
        ctx.fillText(stat.label.toUpperCase(), barX, barY - 12)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#b96eff'
        ctx.fillText(`${stat.value}`, barX + barW, barY - 12)
        ctx.textAlign = 'left'

        // Fond de barre
        roundRectPath(ctx, barX, barY, barW, barH, 8)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()

        // Remplissage
        const fillW = Math.max(6, (barW * stat.value) / 100)
        const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0)
        fillGrad.addColorStop(0, '#b96eff')
        fillGrad.addColorStop(1, '#7b9fff')
        roundRectPath(ctx, barX, barY, fillW, barH, 8)
        ctx.fillStyle = fillGrad
        ctx.fill()

        barY += barGap
      })

      // Footer
      ctx.textAlign = 'center'
      ctx.font = '13px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillText('PHOENIX RP · FICHE PERSONNAGE', W / 2, H - 30)

      // Téléchargement
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
      <div className="screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(185,110,255,0.1), transparent 60%), var(--bg)' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Résumé personnage</span>
          <button className="icon-btn" onClick={() => setEditing(e => !e)}>
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {!editing ? (
            <div ref={cardRef} key={animKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

              {/* Avatar animé */}
              <div style={{
                width: 104, height: 104, borderRadius: '50%', padding: 3,
                background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                boxShadow: '0 0 30px rgba(185,110,255,0.4)',
                animation: 'cardPop 0.5s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  border: '3px solid var(--bg)', overflow: 'hidden',
                  background: profile?.avatar_color ?? '#333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 34, fontWeight: 800, color: '#fff',
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : profile?.initials ?? '?'
                  }
                </div>
              </div>

              {/* Nom + job + quartier */}
              <div style={{ textAlign: 'center', animation: 'cardFadeUp 0.5s ease 0.1s both' }}>
                <p style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>{profile?.username ?? '—'}</p>
                {job && <p style={{ fontSize: 13, fontWeight: 600, color: '#c9a6ff', marginTop: 2 }}>{job}</p>}
                {profile?.location && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>📍 {profile.location}</p>
                )}
              </div>

              {/* Barres de stats animées */}
              <div style={{ width: '100%', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {stats.map((stat, i) => (
                  <div key={i} style={{ animation: `cardFadeUp 0.5s ease ${0.15 + i * 0.08}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.05em' }}>
                        {stat.label.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 6,
                        background: 'linear-gradient(90deg, #b96eff, #7b9fff)',
                        width: `${stat.value}%`,
                        animation: `barGrow 0.9s cubic-bezier(0.22,1,0.36,1) ${0.25 + i * 0.08}s both`,
                        '--target-width': `${stat.value}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton export */}
              <button
                onClick={exportCard}
                disabled={exporting}
                style={{
                  marginTop: 24, width: '100%', padding: '13px',
                  borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 8px 24px rgba(185,110,255,0.3)',
                  animation: 'cardFadeUp 0.5s ease 0.5s both',
                }}
              >
                {exporting ? 'Génération…' : '📥 Exporter en image'}
              </button>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Télécharge une image PNG à poster où tu veux (Discord inclus).
              </p>
            </div>
          ) : (
            // ── Formulaire d'édition ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Fonction / Job</label>
                <input value={job} onChange={e => setJob(e.target.value)} placeholder="ex: Barman au Sundown Strip" />
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>
                Statistiques (4 max)
              </p>

              {stats.map((stat, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={stat.label}
                      onChange={e => updateStatLabel(i, e.target.value)}
                      placeholder="Nom de la stat"
                      style={{
                        flex: 1, border: '1px solid var(--border2)', borderRadius: 10,
                        padding: '8px 12px', background: 'var(--bg3)', color: 'var(--t1)',
                        fontSize: 12, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <span style={{
                      width: 40, textAlign: 'center', fontSize: 13, fontWeight: 700,
                      color: 'var(--accent)', alignSelf: 'center',
                    }}>{stat.value}</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={stat.value}
                    onChange={e => updateStatValue(i, e.target.value)}
                    style={{ width: '100%', accentColor: '#b96eff' }}
                  />
                </div>
              ))}

              {saving ? null : (
                <button onClick={handleSave} className="btn-primary" style={{ marginTop: 8 }}>
                  Sauvegarder
                </button>
              )}
              {saving && (
                <button className="btn-primary" disabled style={{ marginTop: 8, opacity: 0.6 }}>
                  Sauvegarde…
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cardPop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barGrow {
          from { width: 0% !important; }
        }
      `}</style>
    </div>
  )
}

function drawAvatarFallback(ctx, x, y, size, profile) {
  ctx.fillStyle = profile?.avatar_color ?? '#7c3aed'
  ctx.fillRect(x - size / 2, y - size / 2, size, size)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${size * 0.36}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(profile?.initials ?? '?', x, y)
  ctx.textBaseline = 'alphabetic'
}

function loadImageCrossOrigin(src) {
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
