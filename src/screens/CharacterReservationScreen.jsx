import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function CharacterReservationScreen({ onDone, onCancel }) {
  const { reserveCharacter } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [jobWish, setJobWish]     = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const inputRef = useRef()

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await reserveCharacter({ firstName, lastName, jobWish, avatarFile })
      setDone(true)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(185,110,255,0.1) 0%, transparent 60%), #050508',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center',
      }}>
        <div style={{ fontSize: 52 }}>📋</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Réservation envoyée</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 320, lineHeight: 1.6 }}>
          Ton personnage est en attente de validation par le MJ. Tu seras notifié une fois qu'il sera approuvé et jouable.
        </p>
        {onDone && (
          <button onClick={onDone} style={{
            marginTop: 12, padding: '13px 32px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Continuer
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(185,110,255,0.08) 0%, transparent 60%), #050508',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', color: '#fff', padding: 20, overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            color: 'rgba(185,110,255,0.7)', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Phoenix RP · Réservation de personnage
          </p>
          <h1 style={{
            fontSize: 26, fontWeight: 800, letterSpacing: -0.6,
            background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Réserve ton personnage
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            Ces informations seront soumises au MJ pour validation.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: 26, display: 'flex', flexDirection: 'column', gap: 18,
        }}>

          {/* Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => inputRef.current.click()}
              style={{
                width: 96, height: 96, borderRadius: '50%', cursor: 'pointer',
                background: 'linear-gradient(135deg, #b96eff, #7b9fff)', padding: 3,
              }}
            >
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: '#12121f', border: '3px solid #050508',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {preview
                  ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 26 }}>📸</span>
                }
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {preview ? 'Clique pour changer' : 'Photo du personnage (optionnel)'}
            </p>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Prénom
              </label>
              <input
                value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Elara"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nom
              </label>
              <input
                value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Nightborn"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Souhait de job (optionnel)
            </label>
            <input
              value={jobWish} onChange={e => setJobWish(e.target.value)}
              placeholder="ex: Barman, Avocat, Mécanicien…"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(185,110,255,0.3)', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Envoi…' : '📋 Envoyer la réservation'}
          </button>
        </div>

        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Retour
          </button>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
}
