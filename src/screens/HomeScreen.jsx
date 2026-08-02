import { useState, useRef, useEffect } from 'react'
import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

import { ALL_APPS } from '../constants/apps'

const MJ_DISCORD_ID = '804959890291294209'

const STORAGE_KEY = 'rp_app_order'

export default function HomeScreen({ onOpenApp, phoneTheme }) {
  const { profile } = useAuth()
  const unlockedApps = profile?.unlocked_apps ?? ['messages', 'phone', 'instagrim', 'map', 'crush', 'id', 'store', 'bank', 'card']
  const isMJ = profile?.discord_id === MJ_DISCORD_ID

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

  // Trier selon l'ordre sauvegardé — le Panel MJ est totalement invisible pour les autres
  const visibleApps = ALL_APPS.filter(a => a.id !== 'mjpanel' || isMJ)
  const sortedApps = [...visibleApps].sort((a, b) => {
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

  function handleClick(app, unlocked, e) {
    if (editMode) return
    if (!unlocked) return

    // Position de l'icône relative au téléphone → pour l'effet "grandit depuis l'icône"
    const iconRect = e.currentTarget.getBoundingClientRect()
    const phoneEl  = e.currentTarget.closest('.phone')
    const phoneRect = phoneEl?.getBoundingClientRect()
    const origin = phoneRect ? {
      x: iconRect.left - phoneRect.left + iconRect.width / 2,
      y: iconRect.top - phoneRect.top + iconRect.height / 2,
    } : null

    onOpenApp(app.id, origin)
  }

  function stopEdit(e) {
    e.stopPropagation()
    setEditMode(false)
  }

  return (
    <div className="phone" onClick={() => editMode && setEditMode(false)}>
      <div className="phone-cam-bump" />
      <div className="phone-crease" />
      <div className="phone-antenna" />
      <div className="phone-bolt tl" />
      <div className="phone-bolt tr" />
      <div className="phone-bolt bl" />
      <div className="phone-bolt br" />
      <StatusBar />
      <div className="home-wrap">

        <div className="home-time">
          <Clock big />
          <p className="home-date">{dateStr} · {location}</p>
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
            const unlocked   = app.id === 'mjpanel' ? true : unlockedApps.includes(app.id)
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
                onClick={e => handleClick(app, unlocked, e)}
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
