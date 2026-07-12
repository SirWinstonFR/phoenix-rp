import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Clock from '../components/Clock'
import DesktopWindow from './DesktopWindow'
import InstaGrimScreen from '../screens/InstaGrimScreen'
import MapScreen from '../screens/MapScreen'
import './desktop.css'

import CrushScreen from '../screens/CrushScreen'
import IDScreen from '../screens/IDScreen'

const APPS = [
  { id: 'messages',  label: 'Messages',  icon: '💬', bg: 'linear-gradient(135deg,#1a1a3e,#0d1a2e)' },
  { id: 'instagrim', label: 'Capture',   icon: null,  img: '/capture.png', bg: 'transparent' },
  { id: 'map',       label: 'Carte',     icon: '🗺️', bg: 'linear-gradient(135deg,#0a1f2e,#0d2a1a)' },
  { id: 'crush',     label: 'Crush',     icon: '💘', bg: 'linear-gradient(135deg,#3d0020,#1a000f)' },
  { id: 'id',        label: 'ID Card',   icon: '🪪', bg: 'linear-gradient(135deg,#0a2a6e,#1a4aae)' },
  { id: 'notes',     label: 'Notes',     icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'settings',  label: 'Réglages',  icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
]

let nextZ = 100

export default function DesktopMode({ onSwitchToPhone }) {
  const { profile, signOut } = useAuth()
  const [windows, setWindows]   = useState([])
  const [showStart, setShowStart] = useState(false)

  function openApp(appId) {
    setShowStart(false)
    const existing = windows.find(w => w.id === appId)
    if (existing) {
      // Restaurer si minimisée, sinon focus
      setWindows(prev => prev.map(w =>
        w.id === appId
          ? { ...w, minimized: false, focused: true, z: ++nextZ }
          : { ...w, focused: false }
      ))
      return
    }

    const app = APPS.find(a => a.id === appId)
    if (!app) return

    // Position en cascade
    const offset = windows.length * 30
    setWindows(prev => [
      ...prev.map(w => ({ ...w, focused: false })),
      {
        id:        appId,
        title:     app.label,
        icon:      app.icon,
        img:       app.img,
        minimized: false,
        maximized: false,
        focused:   true,
        z:         ++nextZ,
        x:         80 + offset,
        y:         50 + offset,
        w:         600,
        h:         560,
      }
    ])
  }

  function focusWindow(id) {
    setWindows(prev => prev.map(w =>
      w.id === id
        ? { ...w, focused: true, z: ++nextZ }
        : { ...w, focused: false }
    ))
  }

  function closeWindow(id) {
    setWindows(prev => prev.filter(w => w.id !== id))
  }

  function minimizeWindow(id) {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: true, focused: false } : w
    ))
  }

  function maximizeWindow(id) {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, maximized: !w.maximized } : w
    ))
  }

  function renderWindowContent(win) {
    switch (win.id) {
      case 'instagrim':
        return <InstaGrimScreen onBack={() => closeWindow(win.id)} />
      case 'map':
        return <MapScreen onBack={() => closeWindow(win.id)} />
      case 'crush':
        return <CrushScreen onBack={() => closeWindow(win.id)} />
      case 'id':
        return <IDScreen onBack={() => closeWindow(win.id)} />
      default:
        return (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--t3)',
          }}>
            <span style={{ fontSize: 48 }}>{win.icon}</span>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{win.title}</p>
            <p style={{ fontSize: 12 }}>Cette app arrive bientôt en mode desktop !</p>
          </div>
        )
    }
  }

  // Fermer le menu Start si clic ailleurs
  useEffect(() => {
    if (!showStart) return
    const close = () => setShowStart(false)
    setTimeout(() => window.addEventListener('click', close), 100)
    return () => window.removeEventListener('click', close)
  }, [showStart])

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  })

  return (
    <div className="desktop">

      {/* Bureau */}
      <div className="desktop-area" onClick={() => setShowStart(false)}>

        {/* Icônes */}
        <div className="desktop-icons">
          {APPS.map((app, i) => (
            <div
              key={app.id}
              className="desktop-icon"
              onDoubleClick={() => openApp(app.id)}
            >
              <div className="desktop-icon-img" style={{ background: app.bg }}>
                {app.img
                  ? <img src={app.img} alt={app.label} />
                  : <span>{app.icon}</span>
                }
              </div>
              <span className="desktop-icon-label">{app.label}</span>
            </div>
          ))}
        </div>

        {/* Fenêtres */}
        {windows.map(win => (
          <DesktopWindow
            key={win.id}
            id={win.id}
            title={win.title}
            icon={win.icon}
            img={win.img}
            focused={win.focused}
            minimized={win.minimized}
            maximized={win.maximized}
            initialX={win.x}
            initialY={win.y}
            initialW={win.w}
            initialH={win.h}
            onFocus={focusWindow}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
          >
            {renderWindowContent(win)}
          </DesktopWindow>
        ))}

      </div>

      {/* Menu Start */}
      {showStart && (
        <div className="start-menu" onClick={e => e.stopPropagation()}>

          {/* Profil */}
          <div className="start-menu-user">
            <Avatar profile={profile} size={38} />
            <div>
              <p className="start-menu-user-name">{profile?.username ?? 'Joueur'}</p>
              <p className="start-menu-user-sub">{profile?.location || 'Phoenix RP'}</p>
            </div>
          </div>

          <p className="start-menu-title">Applications</p>

          {APPS.map(app => (
            <div
              key={app.id}
              className="start-menu-item"
              onClick={() => openApp(app.id)}
            >
              <div className="start-menu-icon" style={{ background: app.bg }}>
                {app.img
                  ? <img src={app.img} alt={app.label} />
                  : <span>{app.icon}</span>
                }
              </div>
              <span className="start-menu-name">{app.label}</span>
            </div>
          ))}

          <div className="start-menu-divider" />

          <div className="start-menu-item" onClick={signOut}>
            <div className="start-menu-icon" style={{ background: '#1a0a0a' }}>🔒</div>
            <span className="start-menu-name">Se déconnecter</span>
          </div>

        </div>
      )}

      {/* Barre des tâches */}
      <div className="taskbar">

        {/* Bouton Start */}
        <button className="start-btn" onClick={e => { e.stopPropagation(); setShowStart(!showStart) }}>
          ⊞
        </button>

        <div className="taskbar-sep" />

        {/* Applis ouvertes */}
        {windows.map(win => (
          <div
            key={win.id}
            className={`taskbar-app ${win.focused && !win.minimized ? 'active' : ''}`}
            onClick={() => {
              if (win.minimized) {
                setWindows(prev => prev.map(w =>
                  w.id === win.id ? { ...w, minimized: false, focused: true } : { ...w, focused: false }
                ))
              } else if (win.focused) {
                minimizeWindow(win.id)
              } else {
                focusWindow(win.id)
              }
            }}
          >
            <div className="taskbar-app-icon" style={{ background: APPS.find(a => a.id === win.id)?.bg }}>
              {win.img
                ? <img src={win.img} alt="" />
                : <span style={{ fontSize: 12 }}>{win.icon}</span>
              }
            </div>
            <span className="taskbar-app-name">{win.title}</span>
          </div>
        ))}

        {/* Zone droite */}
        <div className="taskbar-right">

          {/* Bouton bascule */}
          <button className="mode-toggle" onClick={onSwitchToPhone}>
            📱 Téléphone
          </button>

          {/* Heure */}
          <div className="taskbar-clock">
            <Clock />
            <div style={{ fontSize: 10, color: '#666' }}>{today}</div>
          </div>

        </div>
      </div>

    </div>
  )
}
