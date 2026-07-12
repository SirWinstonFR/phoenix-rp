import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

// Génère un numéro d'ID unique style américain
function generateIdNumber(userId) {
  const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `PHX-${hash.slice(0,4)}-${hash.slice(4,8)}`
}

// Convertit une image en noir et blanc via canvas
function toBW(imgUrl, callback) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < data.data.length; i += 4) {
      const avg = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3
      data.data[i] = data.data[i+1] = data.data[i+2] = avg
    }
    ctx.putImageData(data, 0, 0)
    callback(canvas.toDataURL())
  }
  img.onerror = () => callback(null)
  img.src = imgUrl
}

export default function IDScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [bwPhoto, setBwPhoto]       = useState(null)
  const [editing, setEditing]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [flipped, setFlipped]       = useState(false)
  const [birthPlace, setBirthPlace] = useState(profile?.birth_place ?? '')
  const [rpAddress, setRpAddress]   = useState(profile?.rp_address ?? '')
  const [birthDate, setBirthDate]   = useState(profile?.birth_date ?? '')
  const [error, setError]           = useState('')

  // Générer/sauvegarder le numéro d'ID si absent
  useEffect(() => {
    if (!profile?.id_number && user) {
      const idNum = generateIdNumber(user.id)
      updateProfile({ id_number: idNum })
    }
  }, [profile, user])

  // Convertir la photo en N&B
  useEffect(() => {
    if (profile?.avatar_url) {
      toBW(profile.avatar_url, result => setBwPhoto(result))
    }
  }, [profile?.avatar_url])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateProfile({
        birth_place: birthPlace.trim(),
        rp_address:  rpAddress.trim(),
        birth_date:  birthDate.trim(),
      })
      setEditing(false)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const idNumber  = profile?.id_number ?? generateIdNumber(user?.id ?? '000')
  const issuedAt  = profile?.id_issued_at
    ? new Date(profile.id_issued_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  const hasExtraInfo = profile?.birth_place || profile?.rp_address || profile?.birth_date

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: '#0a0a0f', overflowY: 'auto' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Carte d'identité</span>
          <button className="icon-btn" onClick={() => { setEditing(!editing); setError('') }}>
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>

          {/* ── CARTE ── */}
          <div
            onClick={() => !editing && setFlipped(f => !f)}
            style={{
              width: '100%', maxWidth: 300,
              perspective: 1000,
              cursor: editing ? 'default' : 'pointer',
            }}
          >
            <div style={{
              position: 'relative',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              height: 480,
            }}>

              {/* ── RECTO ── */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Bande bleue en haut */}
                <div style={{
                  height: 56,
                  background: 'linear-gradient(135deg, #0a2a6e, #1a4aae)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 16px', gap: 10,
                  borderBottom: '2px solid #2a5aff',
                }}>
                  {/* Sceau */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>🦅</div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', lineHeight: 1.2 }}>
                      PHOENIX REPUBLIC
                    </p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
                      FEDERAL IDENTIFICATION CARD
                    </p>
                  </div>
                </div>

                {/* Corps */}
                <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Photo + infos principales */}
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Photo N&B */}
                    <div style={{
                      width: 90, height: 110, flexShrink: 0,
                      background: '#1a1a2e',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {bwPhoto
                        ? <img src={bwPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.1)' }} />
                        : profile?.avatar_url
                          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.1)' }} />
                          : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 28, filter: 'grayscale(1)' }}>👤</span>
                              <p style={{ fontSize: 8, color: '#444', textAlign: 'center' }}>PHOTO</p>
                            </div>
                      }
                      {/* Filigrane */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,50,150,0.05) 4px, rgba(0,50,150,0.05) 5px)',
                        pointerEvents: 'none',
                      }} />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <IDField label="FULL NAME" value={profile?.username ?? '—'} large />
                      <IDField label="ID NUMBER" value={idNumber} mono accent />
                      {profile?.birth_date && <IDField label="DATE OF BIRTH" value={profile.birth_date} />}
                      {profile?.birth_place && <IDField label="PLACE OF BIRTH" value={profile.birth_place} />}
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                  {/* Adresse */}
                  {profile?.rp_address && (
                    <IDField label="ADDRESS" value={profile.rp_address} />
                  )}

                  {/* Bio courte */}
                  {profile?.bio && (
                    <IDField label="DESCRIPTION" value={profile.bio.slice(0, 80) + (profile.bio.length > 80 ? '…' : '')} small />
                  )}

                  {/* Séparateur */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                  {/* Date d'émission */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <IDField label="DATE ISSUED" value={issuedAt} small />
                    <IDField label="STATUS" value="ACTIVE ✓" small accent />
                  </div>
                </div>

                {/* Bande magnétique déco en bas */}
                <div style={{
                  height: 28,
                  background: 'linear-gradient(90deg, #0a2a6e, #1a4aae, #0a2a6e)',
                  borderTop: '1px solid rgba(42,90,255,0.4)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 14px',
                  justifyContent: 'space-between',
                }}>
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                    {idNumber.replace(/-/g, ' ')}
                  </p>
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                    PHOENIX RP © 2025
                  </p>
                </div>
              </div>

              {/* ── VERSO ── */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Bande magnétique */}
                <div style={{ height: 40, background: '#111', marginTop: 20 }} />

                <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Signature
                  </p>
                  {/* Zone signature */}
                  <div style={{
                    height: 44, background: '#fff',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                  }}>
                    <p style={{
                      fontFamily: 'Georgia, serif', fontSize: 18,
                      color: '#1a1a3e', fontStyle: 'italic',
                      letterSpacing: 2,
                    }}>
                      {profile?.username ?? ''}
                    </p>
                  </div>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />

                  {/* Mentions légales */}
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7, letterSpacing: '0.02em' }}>
                    This card is the property of the Phoenix Republic. It must be carried at all times and presented upon request to any authorized official. Unauthorized reproduction or alteration of this document is a federal offense punishable under the laws of Phoenix Republic.
                  </p>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                  {/* QR code fictif */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 64, height: 64, flexShrink: 0,
                      background: '#fff', borderRadius: 6, padding: 4,
                      display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 1,
                    }}>
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} style={{
                          background: Math.random() > 0.5 ? '#000' : '#fff',
                          borderRadius: 1,
                        }} />
                      ))}
                    </div>
                    <div>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 6 }}>VERIFICATION CODE</p>
                      <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>{idNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Bande bleue bas */}
                <div style={{
                  height: 28,
                  background: 'linear-gradient(90deg, #0a2a6e, #1a4aae, #0a2a6e)',
                  borderTop: '1px solid rgba(42,90,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em' }}>
                    PHOENIX REPUBLIC · FEDERAL ID
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!editing && (
            <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>
              Appuie sur la carte pour la retourner
            </p>
          )}

          {/* ── FORMULAIRE D'ÉDITION ── */}
          {editing && (
            <div style={{
              width: '100%',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 18, padding: '18px',
              display: 'flex', flexDirection: 'column', gap: 14,
              animation: 'fadeUp 0.25s ease',
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                Compléter la carte
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Date de naissance
                </label>
                <input
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  placeholder="ex: 15 Mars 1994"
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 12, padding: '10px 14px',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Lieu de naissance
                </label>
                <input
                  value={birthPlace}
                  onChange={e => setBirthPlace(e.target.value)}
                  placeholder="ex: Northside, Phoenix"
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 12, padding: '10px 14px',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Adresse RP
                </label>
                <input
                  value={rpAddress}
                  onChange={e => setRpAddress(e.target.value)}
                  placeholder="ex: 742 Evergreen Terrace, Phoenix"
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 12, padding: '10px 14px',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(255,82,82,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '13px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #0a2a6e, #1a4aae)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(10,42,110,0.4)',
                }}
              >
                {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// Composant champ de carte
function IDField({ label, value, large, small, mono, accent }) {
  return (
    <div>
      <p style={{
        fontSize: 7, fontWeight: 700, letterSpacing: '0.15em',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
        marginBottom: 2,
      }}>{label}</p>
      <p style={{
        fontSize: large ? 14 : small ? 9 : 11,
        fontWeight: large ? 800 : 600,
        color: accent ? '#4a9eff' : '#e8e8e8',
        letterSpacing: mono ? '0.1em' : '0.02em',
        fontFamily: mono ? 'monospace' : 'inherit',
        lineHeight: 1.3,
      }}>{value || '—'}</p>
    </div>
  )
}
