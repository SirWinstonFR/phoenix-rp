import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

function generateIdNumber(userId) {
  const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `A${hash.slice(0,3)}-${hash.slice(3,6)}-${hash.slice(6,8)}0`
}

export default function IDScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [bwPhoto, setBwPhoto]       = useState(null)
  const [editing, setEditing]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [flipped, setFlipped]       = useState(false)
  const [birthPlace, setBirthPlace] = useState('')
  const [rpAddress, setRpAddress]   = useState('')
  const [birthDate, setBirthDate]   = useState('')
  const [height, setHeight]         = useState('')
  const [eyeColor, setEyeColor]     = useState('')
  const [error, setError]           = useState('')

  useEffect(() => {
    if (profile) {
      setBirthPlace(profile.birth_place ?? '')
      setRpAddress(profile.rp_address ?? '')
      setBirthDate(profile.birth_date ?? '')
      setHeight(profile.height ?? '')
      setEyeColor(profile.eye_color ?? '')
    }
  }, [profile])

  useEffect(() => {
    if (!profile?.id_number && user) {
      updateProfile({ id_number: generateIdNumber(user.id) })
    }
  }, [profile, user])

  useEffect(() => {
    if (profile?.avatar_url) {
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
          const avg = (data.data[i] * 0.299 + data.data[i+1] * 0.587 + data.data[i+2] * 0.114)
          data.data[i] = data.data[i+1] = data.data[i+2] = avg
        }
        ctx.putImageData(data, 0, 0)
        setBwPhoto(canvas.toDataURL())
      }
      img.src = profile.avatar_url
    }
  }, [profile?.avatar_url])

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await updateProfile({
        birth_place: birthPlace.trim(),
        rp_address:  rpAddress.trim(),
        birth_date:  birthDate.trim(),
        height:      height.trim(),
        eye_color:   eyeColor.trim(),
      })
      setEditing(false)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const idNumber = profile?.id_number ?? generateIdNumber(user?.id ?? '00000000')
  const issuedAt = profile?.id_issued_at
    ? new Date(profile.id_issued_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : '01/01/2025'
  const expiresAt = profile?.id_issued_at
    ? new Date(new Date(profile.id_issued_at).setFullYear(new Date(profile.id_issued_at).getFullYear() + 5))
        .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : '01/01/2030'

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: '#08080f', overflowY: 'auto' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">ID Card</span>
          <button className="icon-btn" onClick={() => { setEditing(!editing); setError('') }}>
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>

          {/* ── CARTE ── */}
          <div
            onClick={() => !editing && setFlipped(f => !f)}
            style={{ width: '100%', maxWidth: 300, perspective: 1200, cursor: editing ? 'default' : 'pointer' }}
          >
            <div style={{
              position: 'relative', transformStyle: 'preserve-3d',
              transition: 'transform 0.65s cubic-bezier(0.22,1,0.36,1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
              height: 490,
            }}>

              {/* ══ RECTO ══ */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                background: '#f0ede6',
                display: 'flex', flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
              }}>

                {/* Header Arizona */}
                <div style={{
                  background: 'linear-gradient(135deg, #8B1A1A 0%, #C0392B 40%, #8B1A1A 100%)',
                  padding: '8px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Sceau Arizona simplifié */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      border: '2px solid rgba(255,255,255,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>🌵</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1 }}>ARIZONA</p>
                      <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.15em' }}>DRIVER LICENSE / ID</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>CITY OF PHOENIX</p>
                    <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>IDENTIFICATION CARD</p>
                  </div>
                </div>

                {/* Bande décorative or/jaune */}
                <div style={{ height: 4, background: 'linear-gradient(90deg, #C8A040, #F0C040, #C8A040)' }} />

                {/* Corps principal */}
                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Ligne photo + infos */}
                  <div style={{ display: 'flex', gap: 10 }}>

                    {/* Photo */}
                    <div style={{
                      width: 88, height: 112, flexShrink: 0,
                      background: '#d0ccc4',
                      border: '1.5px solid #aaa',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {(bwPhoto || profile?.avatar_url)
                        ? <img
                            src={bwPhoto ?? profile.avatar_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.05)' }}
                          />
                        : <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 30, filter: 'grayscale(1)' }}>👤</div>
                            <p style={{ fontSize: 7, color: '#888', marginTop: 2 }}>PHOTO</p>
                          </div>
                      }
                    </div>

                    {/* Infos droite */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <AZField label="DL/ID#" value={idNumber} mono bold color="#8B1A1A" />
                      <AZField label="EXP" value={expiresAt} />
                      <AZField label="ISS" value={issuedAt} />
                      {profile?.birth_date && <AZField label="DOB" value={profile.birth_date} />}
                      {height && <AZField label="HGT" value={height} />}
                      {eyeColor && <AZField label="EYES" value={eyeColor} />}
                      <AZField label="CLASS" value="IDENTIFICATION" small />
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.1)' }} />

                  {/* Nom complet */}
                  <div>
                    <p style={{ fontSize: 7, color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Last Name, First Name</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a', letterSpacing: 1, marginTop: 2 }}>
                      {profile?.username?.toUpperCase() ?? '—'}
                    </p>
                  </div>

                  {/* Adresse */}
                  {profile?.rp_address && (
                    <div>
                      <p style={{ fontSize: 7, color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Address</p>
                      <p style={{ fontSize: 10, color: '#222', fontWeight: 600, marginTop: 1, lineHeight: 1.4 }}>
                        {profile.rp_address}
                      </p>
                      <p style={{ fontSize: 9, color: '#444', marginTop: 1 }}>PHOENIX, AZ</p>
                    </div>
                  )}

                  {/* Lieu de naissance */}
                  {profile?.birth_place && (
                    <AZField label="Place of Birth" value={profile.birth_place} />
                  )}

                  {/* Filigrane Grand Canyon */}
                  <div style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 64, opacity: 0.04, pointerEvents: 'none', zIndex: 0,
                  }}>🏜️</div>

                </div>

                {/* Footer */}
                <div style={{
                  background: '#1a1a2e',
                  padding: '5px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                    {idNumber}
                  </p>
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                    STATE OF ARIZONA · CITY OF PHOENIX
                  </p>
                </div>
              </div>

              {/* ══ VERSO ══ */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                background: '#f0ede6',
                display: 'flex', flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
              }}>
                {/* Bande magnétique */}
                <div style={{ height: 44, background: '#111', marginTop: 24, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'repeating-linear-gradient(90deg, #1a1a1a 0px, #222 2px, #111 4px)',
                  }} />
                </div>

                <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Zone signature */}
                  <div>
                    <p style={{ fontSize: 7, color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Authorized Signature</p>
                    <div style={{
                      height: 40, background: '#fff',
                      border: '1px solid #ccc',
                      display: 'flex', alignItems: 'center', padding: '0 10px',
                    }}>
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1a1a3e', fontStyle: 'italic', letterSpacing: 2 }}>
                        {profile?.username ?? ''}
                      </p>
                    </div>
                  </div>

                  {/* PDF417 fictif */}
                  <div>
                    <p style={{ fontSize: 7, color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>PDF417</p>
                    <div style={{
                      height: 50, background: '#fff', border: '1px solid #ccc',
                      display: 'flex', alignItems: 'center', gap: 1, padding: '4px',
                      overflow: 'hidden',
                    }}>
                      {Array.from({ length: 60 }).map((_, i) => (
                        <div key={i} style={{
                          width: Math.random() > 0.5 ? 3 : 1,
                          height: '100%',
                          background: Math.random() > 0.4 ? '#000' : '#fff',
                          flexShrink: 0,
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Mentions */}
                  <p style={{ fontSize: 7, color: '#888', lineHeight: 1.8, letterSpacing: '0.01em' }}>
                    This card is issued by the State of Arizona. It is the property of the issuing authority and must be surrendered upon demand. Unauthorized reproduction is a felony under A.R.S. § 28-3478. For verification: az.gov/id
                  </p>

                  {/* DD */}
                  <div style={{
                    background: '#1a1a2e', borderRadius: 6,
                    padding: '6px 10px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>DD</p>
                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {idNumber.replace(/-/g, '')}2025AZ
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>RESTRICTED</p>
                      <p style={{ fontSize: 9, color: '#4a9eff', fontWeight: 700 }}>NONE</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  background: 'linear-gradient(135deg, #8B1A1A, #C0392B)',
                  height: 4,
                }} />
                <div style={{
                  background: 'linear-gradient(90deg, #C8A040, #F0C040, #C8A040)',
                  height: 3,
                }} />
              </div>
            </div>
          </div>

          {!editing && (
            <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>
              Appuie sur la carte pour la retourner
            </p>
          )}

          {/* Formulaire */}
          {editing && (
            <div style={{
              width: '100%', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 18,
              padding: '18px', display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Compléter la carte</p>

              {[
                { label: 'Date de naissance (DOB)', value: birthDate, set: setBirthDate, placeholder: 'ex: 03/15/1994' },
                { label: 'Lieu de naissance', value: birthPlace, set: setBirthPlace, placeholder: 'ex: Tucson, AZ' },
                { label: 'Adresse RP', value: rpAddress, set: setRpAddress, placeholder: 'ex: 742 Evergreen Terrace, Phoenix AZ' },
                { label: 'Taille (HGT)', value: height, set: setHeight, placeholder: 'ex: 5-11' },
                { label: 'Couleur des yeux (EYES)', value: eyeColor, set: setEyeColor, placeholder: 'ex: BRN' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {f.label}
                  </label>
                  <input
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border2)',
                      borderRadius: 12, padding: '10px 14px',
                      color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              ))}

              {error && (
                <p style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(255,82,82,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                  {error}
                </p>
              )}

              <button onClick={handleSave} disabled={saving} style={{
                padding: '13px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #8B1A1A, #C0392B)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(139,26,26,0.4)',
              }}>
                {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AZField({ label, value, mono, bold, color, small }) {
  return (
    <div>
      <p style={{ fontSize: 7, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>{label}</p>
      <p style={{
        fontSize: small ? 8 : 10, fontWeight: bold ? 900 : 700,
        color: color ?? '#1a1a1a', letterSpacing: mono ? '0.08em' : '0.02em',
        fontFamily: mono ? 'monospace' : 'Arial, sans-serif',
        lineHeight: 1.3, marginTop: 1,
      }}>{value || '—'}</p>
    </div>
  )
}
