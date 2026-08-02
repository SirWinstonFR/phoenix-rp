import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { NEIGHBORHOODS } from '../constants/neighborhoods'

const ORANGE = '#e8752c'
const ORANGE_LIGHT = '#f5a052'
const ORANGE_DIM = 'rgba(232,117,44,0.12)'
const BACKGROUND_URL = 'https://i.imgur.com/ZHdw4LH.png'

const VIEWPORT = 200 // taille du cadre circulaire de positionnement (px)
const EXPORT_SIZE = 480 // résolution de l'image carrée exportée

export default function CharacterReservationScreen({ onDone, onCancel }) {
  const { reserveCharacter, signOut } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [jobWish, setJobWish]     = useState('')
  const [residence, setResidence] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const inputRef = useRef()

  // ── Positionnement de l'avatar ──
  const [imgSrc, setImgSrc]     = useState(null)   // data URL de l'image chargée
  const [imgNatural, setImgNatural] = useState(null) // { w, h }
  const [zoom, setZoom]         = useState(1)       // multiplicateur au-dessus du "cover" de base
  const [offset, setOffset]     = useState({ x: 0, y: 0 })
  const dragState = useRef(null)
  const imgAreaRef = useRef()

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        setImgNatural({ w: img.width, h: img.height })
        setImgSrc(reader.result)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  // Échelle "cover" de base : l'image couvre entièrement le cadre carré
  function baseScale() {
    if (!imgNatural) return 1
    return Math.max(VIEWPORT / imgNatural.w, VIEWPORT / imgNatural.h)
  }

  function renderedSize() {
    const s = baseScale() * zoom
    return { w: imgNatural.w * s, h: imgNatural.h * s }
  }

  function clampOffset(next, size) {
    const maxX = Math.max(0, (size.w - VIEWPORT) / 2)
    const maxY = Math.max(0, (size.h - VIEWPORT) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  function onPointerDown(e) {
    if (!imgSrc) return
    const point = e.touches ? e.touches[0] : e
    dragState.current = { startX: point.clientX, startY: point.clientY, origin: offset }
  }
  function onPointerMove(e) {
    if (!dragState.current) return
    const point = e.touches ? e.touches[0] : e
    const dx = point.clientX - dragState.current.startX
    const dy = point.clientY - dragState.current.startY
    const next = { x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy }
    setOffset(clampOffset(next, renderedSize()))
  }
  function onPointerUp() {
    dragState.current = null
  }

  function handleZoomChange(value) {
    const newZoom = Number(value)
    setZoom(newZoom)
    const s = baseScale() * newZoom
    setOffset(prev => clampOffset(prev, { w: imgNatural.w * s, h: imgNatural.h * s }))
  }

  // Exporte la portion visible du cadre en image carrée (pour l'upload)
  function exportSquareBlob() {
    return new Promise(resolve => {
      if (!imgSrc || !imgNatural) return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = EXPORT_SIZE
      canvas.height = EXPORT_SIZE
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        const s = baseScale() * zoom
        const renderedW = imgNatural.w * s
        const renderedH = imgNatural.h * s
        // Position du coin haut-gauche de l'image rendue, par rapport au cadre
        const imgLeft = (VIEWPORT - renderedW) / 2 + offset.x
        const imgTop  = (VIEWPORT - renderedH) / 2 + offset.y
        // Portion de l'image source visible dans le cadre, ramenée en coordonnées "naturelles"
        const scaleExport = EXPORT_SIZE / VIEWPORT
        ctx.drawImage(
          img,
          -imgLeft / s, -imgTop / s, VIEWPORT / s, VIEWPORT / s,
          0, 0, EXPORT_SIZE, EXPORT_SIZE
        )
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92)
      }
      img.src = imgSrc
    })
  }

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      let avatarFile = null
      if (imgSrc) {
        const blob = await exportSquareBlob()
        avatarFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      }
      await reserveCharacter({ firstName, lastName, jobWish, residence, avatarFile })
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
      width: '100vw', minHeight: '100vh',
      background: `
        linear-gradient(rgba(6,5,4,0.88), rgba(6,5,4,0.94)),
        url(${BACKGROUND_URL}) center/cover fixed
      `,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', color: '#f5f2ee', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>

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
          background: 'rgba(10,8,6,0.7)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>

          {/* ── Positionnement de la photo ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              ref={imgAreaRef}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              onClick={() => !imgSrc && inputRef.current.click()}
              style={{
                width: VIEWPORT, height: VIEWPORT, borderRadius: '50%',
                overflow: 'hidden', position: 'relative',
                background: '#0d0a08', border: `2px solid ${ORANGE}`,
                cursor: imgSrc ? 'grab' : 'pointer',
                boxShadow: `0 0 0 5px ${ORANGE_DIM}`,
                touchAction: 'none', userSelect: 'none',
              }}
            >
              {imgSrc ? (
                <img
                  src={imgSrc}
                  draggable={false}
                  alt=""
                  style={{
                    position: 'absolute',
                    width: renderedSize().w, height: renderedSize().h,
                    left: '50%', top: '50%',
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, opacity: 0.5,
                }}>📸</div>
              )}
            </div>

            {imgSrc ? (
              <div style={{ width: VIEWPORT, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(245,242,238,0.4)' }}>🔍</span>
                  <input
                    type="range" min="1" max="2.5" step="0.01" value={zoom}
                    onChange={e => handleZoomChange(e.target.value)}
                    style={{ flex: 1, accentColor: ORANGE }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => inputRef.current.click()}
                    style={{ background: 'none', border: 'none', color: ORANGE_LIGHT, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Changer d'image
                  </button>
                  <p style={{ fontSize: 10, color: 'rgba(245,242,238,0.3)' }}>Glisse pour repositionner</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.35)' }}>
                Photo du personnage (optionnel)
              </p>
            )}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Lieu de résidence (optionnel)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NEIGHBORHOODS.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setResidence(prev => prev === n.name ? '' : n.name)}
                  style={{
                    padding: '8px 13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600,
                    background: residence === n.name ? `${n.color}26` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${residence === n.name ? n.color : 'rgba(255,255,255,0.1)'}`,
                    color: residence === n.name ? n.color : 'rgba(245,242,238,0.6)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.color }} />
                  {n.name}
                </button>
              ))}
            </div>
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
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading ? 'Envoi…' : '📋 Envoyer la réservation'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {onCancel && (
            <button onClick={onCancel} style={{
              background: 'none', border: 'none', color: 'rgba(245,242,238,0.3)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ← Retour
            </button>
          )}
          <button onClick={signOut} style={{
            background: 'none', border: 'none', color: 'rgba(245,242,238,0.3)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'rgba(245,242,238,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 11, padding: '13px 14px', color: '#f5f2ee', fontSize: 15,
  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s',
}
