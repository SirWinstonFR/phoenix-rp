import { useState, useRef, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import PhoneLoginScreen from './screens/PhoneLoginScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'
import MapScreen from './screens/MapScreen'
import DesktopMode from './desktop/DesktopMode'

import CrushScreen from './screens/CrushScreen'
import IDScreen from './screens/IDScreen'
import StoreScreen from './screens/StoreScreen'
import BankScreen from './screens/BankScreen'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  map:       MapScreen,
  crush:     CrushScreen,
  id:        IDScreen,
  store:     StoreScreen,
  bank:      BankScreen,
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
  const { user, loading, profile } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('rp_mode') ?? 'phone'
  })
  const touchStartY = useRef(null)

  useEffect(() => {
    localStorage.removeItem('rp_mode')
  }, [])

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    if (deltaY > 70 && currentScreen !== 'home') setCurrentScreen('home')
    touchStartY.current = null
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

  // Thème du téléphone équipé
  const phoneTheme = profile?.phone_theme
  const frameVars  = getFrameVars(phoneTheme?.frame_style)

  if (mode === 'desktop') {
    return <DesktopMode onSwitchToPhone={() => setMode('phone')} />
  }

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ display: 'contents' }}>
      <div style={{
        display: 'contents',
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
      </div>
    </div>
  )
}
