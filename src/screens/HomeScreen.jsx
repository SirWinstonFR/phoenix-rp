import { useState, useRef, useEffect } from 'react'
import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

const ALL_APPS = [
  { id: 'messages',  label: 'Messages',       icon: '💬', bg: 'linear-gradient(135deg,#1a1a3e,#0d1a2e)', badge: 2 },
  { id: 'phone',     label: 'Téléphone',      icon: '📞', bg: 'linear-gradient(135deg,#0d2818,#0a1f12)' },
  { id: 'instagrim', label: 'Capture',        icon: null, img: '/capture.png', bg: 'transparent', badge: 1 },
  { id: 'map',       label: 'Carte',          icon: '🗺️', bg: 'linear-gradient(135deg,#0a1f2e,#0d2a1a)' },
  { id: 'crush',     label: 'Crush',          icon: '💘', bg: 'linear-gradient(135deg,#3d0020,#1a000f)' },
  { id: 'id',        label: 'ID Card',        icon: '🪪', bg: 'linear-gradient(135deg,#0a2a6e,#1a4aae)' },
  { id: 'store',     label: 'Store',          icon: '🛍️', bg: 'linear-gradient(135deg,#1a2e1a,#0a1f0a)' },
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
]

const STORAGE_KEY = 'rp_app_order'

export default function HomeScreen({ onOpenApp, onSwitchToDesktop, phoneTheme }) {
  const { profile, signOut } = useAuth()
  const unlockedApps = profile?.unlocked_apps ?? ['messages', 'phone', 'instagrim', 'map', 'crush', 'id', 'store']

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const location = profile?.location || 'Île de Valoria'

  // Ordre initialisé après le montage pour éviter les erreurs SSR
  const [order, setOrder] = useState(ALL_APPS.map(a => a.id))
  const [editMode, setEditMode] = useState(false)
  const [dragSrc, setDragSrc]   = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const longPressRef = useRef(null)

  // Charger l'ordre sauvegardé après le montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setOrder(parsed)
      }
    } catch {}
  }, [])

  // Sauvegarder l'ordre à chaque changement
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch {}
  }, [order])

  // Trier selon l'ordre sauvegardé
  const sortedApps = [...ALL_APPS].sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  // Long press → mode édition
  function startPress(appId) {
    longPressRef.current = setTimeout(() => {
      setEditMode(true)
      navigator.vibrate?.(30)
    }, 600)
  }

  function endPress() {
    clearTimeout(longPressRef.current)
  }

  // Drag & drop
  function onDragStart(e, id) {
    setDragSrc(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, id) {
    e.preventDefault()
    if (id !== dragSrc) setDragOver(id)
  }

  function onDrop(e, targetId) {
    e.preventDefault()
    if (!dragSrc || dragSrc === targetId) { setDragSrc(null); setDragOver(null); return }
    setOrder(prev => {
      const next = [...prev]
      // S'assurer que tous les ids sont présents
      ALL_APPS.forEach(a => { if (!next.includes(a.id)) next.push(a.id) })
      const from = next.indexOf(dragSrc)
      const to   = next.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      next.splice(from, 1)
      next.splice(to, 0, dragSrc)
      return next
    })
    setDragSrc(null)
    setDragOver(null)
  }

  function onDragEnd() {
    setDragSrc(null)
    setDragOver(null)
  }

  function handleClick(app, unlocked) {
    if (editMode) return
    if (unlocked) onOpenApp(app.id)
  }

  function stopEdit(e) {
    e.stopPropagation()
    setEditMode(false)
  }

  return (
    <div className="phone" onClick={() => editMode && setEditMode(false)}>
      <StatusBar />
      <div className="home-wrap">

        <div className="home-time">
          <Clock big />
          <p className="home-date">{dateStr} · {location}</p>
        </div>

        {/* Barre profil */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '0 14px 4px', padding: '8px 12px',
          background: 'var(--glass)', border: '1px solid var(--border)',
          borderRadius: 16, backdropFilter: 'blur(10px)',
        }}>
          <Avatar profile={profile} size={32} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2 }}>
              {profile?.username ?? 'Joueur'}
            </p>
            {profile?.location && (
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>📍 {profile.location}</p>
            )}
          </div>
          {onSwitchToDesktop && (
            <button onClick={onSwitchToDesktop} style={{
              background: 'rgba(185,110,255,0.1)', border: '1px solid rgba(185,110,255,0.2)',
              borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700,
              color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>🖥️</button>
          )}
          <button onClick={signOut} style={{
            background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)',
            borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700,
            color: '#ff5252', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>🔒</button>
        </div>

        {/* Indication mode édition */}
        {editMode && (
          <p style={{
            textAlign: 'center', fontSize: 11, color: 'var(--accent)',
            fontWeight: 600, padding: '2px 0',
          }}>
            ✏️ Glisse les applis pour les réorganiser
          </p>
        )}

        {/* Grille */}
        <div className="app-grid" onClick={e => e.stopPropagation()}>
          {sortedApps.map((app, i) => {
            const unlocked   = unlockedApps.includes(app.id)
            const isDragging = dragSrc === app.id
            const isOver     = dragOver === app.id

            return (
              <div
                key={app.id}
                className={`app-icon-wrap ${!unlocked ? 'locked' : ''}`}
                draggable={editMode && unlocked}
                onDragStart={e => editMode && unlocked && onDragStart(e, app.id)}
                onDragOver={e => editMode && onDragOver(e, app.id)}
                onDrop={e => editMode && onDrop(e, app.id)}
                onDragEnd={onDragEnd}
                onMouseDown={() => unlocked && startPress(app.id)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={() => unlocked && startPress(app.id)}
                onTouchEnd={endPress}
                onTouchCancel={endPress}
                onClick={() => handleClick(app, unlocked)}
                style={{
                  animationDelay: `${i * 0.06}s`,
                  opacity: isDragging ? 0.35 : 1,
                  transform: isOver ? 'scale(1.12)' : 'scale(1)',
                  transition: 'transform 0.15s, opacity 0.15s',
                  cursor: editMode ? (unlocked ? 'grab' : 'default') : 'pointer',
                  animation: editMode && unlocked
                    ? 'wobble 0.45s ease infinite alternate'
                    : `iconIn 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`,
                }}
              >
                {unlocked && app.img ? (
                  <div style={{ position: 'relative', width: 58, height: 58 }}>
                    <img
                      src={app.img} alt={app.label}
                      style={{ width: 58, height: 58, borderRadius: 18, display: 'block', objectFit: 'cover' }}
                    />
                    {app.badge && !editMode && <span className="app-badge">{app.badge}</span>}
                  </div>
                ) : (
                  <div
                    className="app-icon-box"
                    style={{
                      background: app.bg,
                      outline: isOver ? '2px solid var(--accent)' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <span>{unlocked ? app.icon : '🔒'}</span>
                    {app.badge && unlocked && !editMode && <span className="app-badge">{app.badge}</span>}
                  </div>
                )}
                <span className="app-label">{unlocked ? app.label : 'Verrouillée'}</span>
              </div>
            )
          })}
        </div>

        {/* Barre du bas */}
        <div className="home-bar">
          {editMode ? (
            <button onClick={stopEdit} style={{
              padding: '7px 24px', borderRadius: 20,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(185,110,255,0.4)',
            }}>
              ✓ Terminé
            </button>
          ) : (
            <div className="home-indicator" />
          )}
        </div>
      </div>

      <style>{`
        @keyframes wobble {
          from { transform: rotate(-1.8deg) scale(1.02); }
          to   { transform: rotate(1.8deg) scale(1.02); }
        }
      `}</style>
    </div>
  )
}
