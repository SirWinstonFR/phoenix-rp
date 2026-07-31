import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const ORANGE = '#e8752c'
const ORANGE_LIGHT = '#f5a052'
const ORANGE_DIM = 'rgba(232,117,44,0.12)'

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
        background: `radial-gradient(ellipse 700px 480px at 50% 20%, ${ORANGE_DIM} 0%, transparent 65%), #060504`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 22, padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center',
      }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          background: ORANGE_DIM, border: `1px solid rgba(232,117,44,0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>📋</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#f5f2ee', letterSpacing: -0.4 }}>Réservation envoyée</p>
        <p style={{ fontSize: 14, color: 'rgba(245,242,238,0.5)', maxWidth: 320, lineHeight: 1.6 }}>
          Ton personnage est en attente de validation par le MJ. Tu seras notifié une fois qu'il sera approuvé et jouable.
        </p>
        {onDone && (
          <button onClick={onDone} style={{
            marginTop: 10, padding: '13px 34px', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${ORANGE}, #c85f1e)`,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 8px 24px ${ORANGE_DIM}`,
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
      background: `radial-gradient(ellipse 700px 420px at 50% 0%, ${ORANGE_DIM} 0%, transparent 65%), #060504`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', color: '#f5f2ee', padding: 20, overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 22 }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em',
            color: 'rgba(245,160,82,0.85)', textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '6px 15px', borderRadius: 20, marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, boxShadow: `0 0 8px ${ORANGE}` }} />
            BRIDGE TO PHOENIX · RÉSERVATION
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.5, color: '#f5f2ee' }}>
            Réserve ton personnage
          </h1>
          <p style={{ fontSize: 12.5, color: 'rgba(245,242,238,0.4)', marginTop: 6 }}>
            Ces informations seront soumises au MJ pour validation.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 26, display: 'flex', flexDirection: 'column', gap: 18,
        }}>

          {/* Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => inputRef.current.click()}
              style={{
                width: 92, height: 92, borderRadius: '50%', cursor: 'pointer',
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`, padding: 3,
                boxShadow: `0 6px 20px ${ORANGE_DIM}`,
              }}
            >
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: '#0d0a08', border: '3px solid #060504',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {preview
                  ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 24, opacity: 0.6 }}>📸</span>
                }
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.35)' }}>
              {preview ? 'Clique pour changer' : 'Photo du personnage (optionnel)'}
            </p>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Prénom</label>
              <input
                value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Elara"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = ORANGE}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Nom</label>
              <input
                value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Nightborn"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = ORANGE}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Souhait de job (optionnel)</label>
            <input
              value={jobWish} onChange={e => setJobWish(e.target.value)}
              placeholder="ex: Barman, Avocat, Mécanicien…"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = ORANGE}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {error && (
            <p style={{
              fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '9px 12px',
            }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '14px', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${ORANGE}, #c85f1e)`,
              color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 8px 24px ${ORANGE_DIM}`, opacity: loading ? 0.6 : 1,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading ? 'Envoi…' : '📋 Envoyer la réservation'}
          </button>
        </div>

        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'rgba(245,242,238,0.3)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Retour
          </button>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'rgba(245,242,238,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 11, padding: '11px 14px', color: '#f5f2ee', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s',
}
