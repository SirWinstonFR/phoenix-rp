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
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'camera',    label: 'Appareil photo', icon: '🤳', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
]

const STORAGE_KEY = 'rp_app_order'

function loadOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return ALL_APPS.map(a => a.id)
}

function saveOrder(order) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch {}
}

export default function HomeScreen({ onOpenApp, onSwitchToDesktop }) {
  const { profile, signOut } = useAuth()
  const unlockedApps = profile?.unlocked_apps ?? ['messages', 'phone', 'instagrim', 'map', 'crush']
  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const location = profile?.location || 'Île de Valoria'

  // Ordre des applis (persiste dans localStorage)
  const [order, setOrder] = useState(loadOrder)
  const [editMode, setEditMode]     = useState(false)
  const [dragging, setDragging]     = useState(null)  // id de l'appli draggée
  const [dragOver, setDragOver]     = useState(null)  // id de la cible
  const longPressTimer = useRef(null)

  // Sauvegarder l'ordre à chaque changement
  useEffect(() => { saveOrder(order) }, [order])

  // Trier les applis selon l'ordre sauvegardé
  const sortedApps = [...ALL_APPS].sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  // Long press pour activer le mode édition
  function onPressStart(appId) {
    longPressTimer.current = setTimeout(() => {
      setEditMode(true)
      setDragging(appId)
    }, 600)
  }

  function onPressEnd() {
    clearTimeout(longPressTimer.current)
  }

  // Drag & drop
  function onDragStart(e, appId) {
    setDragging(appId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, appId) {
    e.preventDefault()
    if (appId !== dragging) setDragOver(appId)
  }

  function onDrop(e, targetId) {
    e.preventDefault()
    if (!dragging || dragging === targetId) return

    setOrder(prev => {
      const next = [...prev]
      const fromIdx = next.indexOf(dragging)
      const toIdx   = next.indexOf(targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragging)
      return next
    })

    setDragging(null)
    setDragOver(null)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOver(null)
  }

  function handleIconClick(app, unlocked) {
    if (editMode) return
    if (unlocked) onOpenApp(app.id)
  }

  return (
    <div className="phone" onClick={() => editMode && setEditMode(false)}>
      <StatusBar />
      <div className="home-wrap">

        <div className="home-time">
          <Clock big />
          <p className="home-date">{dateStr} · {location}</p>
        </div>

        {/* Profil + actions */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 10, margin: '0 14px 4px',
          padding: '8px 12px',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
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

        {/* Indicateur mode édition */}
        {editMode && (
          <div style={{
            textAlign: 'center', fontSize: 11, color: 'var(--accent)',
            fontWeight: 600, padding: '4px 0',
            animation: 'fadeDown 0.2s ease',
          }}>
            ✏️ Mode édition — glisse les applis pour les réorganiser
          </div>
        )}

        {/* Grille */}
        <div className="app-grid" onClick={e => e.stopPropagation()}>
          {sortedApps.map((app, i) => {
            const unlocked = unlockedApps.includes(app.id)
            const isDragging  = dragging === app.id
            const isOver      = dragOver === app.id

            return (
              <div
                key={app.id}
                className={`app-icon-wrap ${!unlocked ? 'locked' : ''}`}
                draggable={editMode && unlocked}
                onDragStart={e => editMode && unlocked && onDragStart(e, app.id)}
                onDragOver={e => editMode && onDragOver(e, app.id)}
                onDrop={e => editMode && onDrop(e, app.id)}
                onDragEnd={onDragEnd}
                onMouseDown={() => unlocked && onPressStart(app.id)}
                onMouseUp={onPressEnd}
                onMouseLeave={onPressEnd}
                onTouchStart={() => unlocked && onPressStart(app.id)}
                onTouchEnd={onPressEnd}
                onClick={() => handleIconClick(app, unlocked)}
                style={{
                  animationDelay: editMode ? '0s' : `${i * 0.06}s`,
                  opacity: isDragging ? 0.4 : 1,
                  transform: isOver ? 'scale(1.1)' : editMode ? 'scale(1)' : undefined,
                  transition: 'transform 0.15s, opacity 0.15s',
                  cursor: editMode ? 'grab' : 'pointer',
                  animation: editMode && unlocked
                    ? 'wobble 0.4s ease infinite alternate'
                    : undefined,
                }}
              >
                {unlocked && app.img ? (
                  <div style={{ position: 'relative', width: 58, height: 58 }}>
                    <img src={app.img} alt={app.label}
                      style={{ width: 58, height: 58, borderRadius: 18, display: 'block', objectFit: 'cover' }} />
                    {app.badge && !editMode && <span className="app-badge">{app.badge}</span>}
                    {editMode && (
                      <div style={{
                        position: 'absolute', top: -4, left: -4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#333', border: '1.5px solid #555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#aaa',
                      }}>✕</div>
                    )}
                  </div>
                ) : (
                  <div className="app-icon-box" style={{
                    background: app.bg,
                    outline: isOver ? '2px solid var(--accent)' : 'none',
                  }}>
                    <span>{unlocked ? app.icon : '🔒'}</span>
                    {app.badge && unlocked && !editMode && <span className="app-badge">{app.badge}</span>}
                    {editMode && unlocked && (
                      <div style={{
                        position: 'absolute', top: -4, left: -4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#333', border: '1.5px solid #555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#aaa',
                      }}>✕</div>
                    )}
                  </div>
                )}
                <span className="app-label">{unlocked ? app.label : 'Verrouillée'}</span>
              </div>
            )
          })}
        </div>

        <div className="home-bar">
          {editMode ? (
            <button
              onClick={() => setEditMode(false)}
              style={{
                padding: '6px 20px', borderRadius: 20,
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Terminé
            </button>
          ) : (
            <div className="home-indicator" />
          )}
        </div>
      </div>

      <style>{`
        @keyframes wobble {
          from { transform: rotate(-1.5deg) scale(1.02); }
          to   { transform: rotate(1.5deg) scale(1.02); }
        }
      `}</style>
    </div>
  )
}
