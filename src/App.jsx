import { useState, useRef, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import PhoneLoginScreen from './screens/PhoneLoginScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'
import MapScreen from './screens/MapScreen'
import DesktopMode from './desktop/DesktopMode'
import CharacterSelector from './screens/CharacterSelector'

import CrushScreen from './screens/CrushScreen'
import IDScreen from './screens/IDScreen'
import StoreScreen from './screens/StoreScreen'
import BankScreen from './screens/BankScreen'
import DarkWebScreen from './screens/DarkWebScreen'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  map:       MapScreen,
  crush:     CrushScreen,
  id:        IDScreen,
  store:     StoreScreen,
  bank:      BankScreen,
  darkweb:   DarkWebScreen,
}

// Calcule les variables CSS de silhouette selon le style de châssis
function getFrameVars(frameStyle) {
  switch (frameStyle) {
    case 'curved': // Samsung-like : coins très arrondis, punch-hole, boutons visibles
      return {
        '--phone-notch-w': '14px',
        '--phone-notch-h': '14px',
        '--phone-notch-radius': '50%',
        '--phone-buttons-display': 'block',
        '--phone-shell-w': '5px',
      }
    case 'chunky': // Nokia/BudgetPhone : bords épais, pas d'encoche, antenne
      return {
        '--phone-notch-display': 'none',
        '--phone-shell-w': '12px',
        '--phone-antenna-display': 'block',
        '--phone-buttons-display': 'none',
      }
    case 'rugged': // IronPhone : très épais, boulons aux coins
      return {
        '--phone-notch-display': 'none',
        '--phone-shell-w': '14px',
        '--phone-bolts-display': 'block',
        '--phone-buttons-display': 'block',
      }
    case 'foldable': // Flip Z4 : pli au milieu
      return {
        '--phone-notch-w': '12px',
        '--phone-notch-h': '12px',
        '--phone-notch-radius': '50%',
        '--phone-crease-display': 'block',
        '--phone-shell-w': '5px',
      }
    case 'modern': // PhoenixX, PixPhone : bosse caméra discrète
    default:
      return {
        '--phone-notch-w': '80px',
        '--phone-notch-h': '22px',
        '--phone-notch-radius': '18px',
        '--phone-cambump-display': 'block',
        '--phone-cambump-size': '10px',
        '--phone-shell-w': '6px',
      }
  }
}

export default function App() {
  const { user, loading, profile, activeId } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('rp_mode') ?? 'phone'
  })

  // ── Geste "maintenir + glisser vers le haut" pour revenir à l'accueil ──
  const [dragY, setDragY]       = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartY = useRef(null)
  const DRAG_MAX      = 240   // distance (px) pour un rétrécissement complet
  const DRAG_THRESHOLD = 70   // distance (px) à partir de laquelle on valide le retour

  useEffect(() => {
    localStorage.removeItem('rp_mode')
  }, [])

  function onZoneTouchStart(e) {
    if (currentScreen === 'home') return
    touchStartY.current = e.touches[0].clientY
    setDragging(true)
  }

  function onZoneTouchMove(e) {
    if (touchStartY.current === null) return
    const delta = touchStartY.current - e.touches[0].clientY
    if (delta > 0) setDragY(delta)
  }

  function onZoneTouchEnd() {
    if (touchStartY.current === null) return
    touchStartY.current = null

    if (dragY > DRAG_THRESHOLD) {
      // Terminer l'animation de sortie puis basculer sur l'accueil
      setDragging(false)
      setDragY(DRAG_MAX + 40)
      setTimeout(() => {
        setCurrentScreen('home')
        setDragY(0)
      }, 260)
    } else {
      // Pas assez glissé → revient en place
      setDragging(false)
      setDragY(0)
    }
  }

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div className="spinner" />
        <p style={{ color: '#333', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>Chargement…</p>
      </div>
    )
  }

  if (!user) return <PhoneLoginScreen />

  // Compte connecté mais aucun personnage sélectionné (plusieurs dispo)
  if (!activeId) return <CharacterSelector />

  // Thème du téléphone équipé
  const phoneTheme = profile?.phone_theme
  const frameVars  = getFrameVars(phoneTheme?.frame_style)

  if (mode === 'desktop') {
    return <DesktopMode onSwitchToPhone={() => setMode('phone')} />
  }

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  // Calcul de l'animation de rétrécissement en direct
  const dragProgress = Math.min(dragY / DRAG_MAX, 1)
  const liveScale     = 1 - dragProgress * 0.22
  const liveTranslateY = dragProgress * -16
  const liveOpacity    = 1 - dragProgress * 0.45

  return (
    <div style={{
      position: 'relative',
      transform: `translateY(${liveTranslateY}px) scale(${liveScale})`,
      opacity: liveOpacity,
      transformOrigin: 'center bottom',
      transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease',
      '--accent':        phoneTheme?.color ?? '#b96eff',
      '--grad':          phoneTheme ? `linear-gradient(135deg, ${phoneTheme.color}, #7b9fff)` : 'linear-gradient(135deg, #b96eff, #7b9fff)',
      '--phone-bg':      phoneTheme?.bg ?? '#080808',
      '--phone-radius':  phoneTheme ? `${phoneTheme.border_radius}px` : '48px',
      '--phone-glow':    phoneTheme ? `${phoneTheme.color}22` : 'rgba(185,110,255,0.07)',
      '--phone-shell':   phoneTheme?.shell ?? '#0c0c0c',
      '--phone-shell-2': phoneTheme?.shell ? phoneTheme.shell + '88' : 'rgba(255,255,255,0.05)',
      '--phone-border':  phoneTheme ? `${phoneTheme.color}33` : 'rgba(255,255,255,0.1)',
      ...frameVars,
    }}>
      <Screen
        onOpenApp={appId => {
          if (SCREENS[appId]) setCurrentScreen(appId)
          else alert('Cette app arrive bientôt !')
        }}
        onBack={() => setCurrentScreen('home')}
        onSwitchToDesktop={() => setMode('desktop')}
        phoneTheme={phoneTheme}
      />

      {/* Zone de geste — tout en bas de l'écran, comme la barre d'accueil iOS */}
      {currentScreen !== 'home' && (
        <div
          onTouchStart={onZoneTouchStart}
          onTouchMove={onZoneTouchMove}
          onTouchEnd={onZoneTouchEnd}
          style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: 140, height: 22, zIndex: 999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 7, cursor: 'grab', touchAction: 'none',
          }}
        >
          <div style={{
            width: 100, height: 4, borderRadius: 3,
            background: dragging ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)',
            transition: dragging ? 'none' : 'background 0.2s',
          }} />
        </div>
      )}
    </div>
  )
}
