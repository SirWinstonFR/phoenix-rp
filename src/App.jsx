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

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  map:       MapScreen,
  crush:     CrushScreen,
  id:        IDScreen,
  store:     StoreScreen,
}

export default function App() {
  const { user, loading, profile } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const [mode, setMode] = useState(() => {
    // Lire le mode choisi avant la redirection Discord
    return localStorage.getItem('rp_mode') ?? 'phone'
  })
  const touchStartY = useRef(null)

  useEffect(() => {
    // Nettoyer après lecture
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
  const themeVars = phoneTheme ? {
    '--accent':      phoneTheme.color,
    '--accent2':     phoneTheme.color,
    '--glow':        phoneTheme.color + '33',
    '--grad':        `linear-gradient(135deg, ${phoneTheme.color}, #7b9fff)`,
  } : {}

  if (mode === 'desktop') {
    return <DesktopMode onSwitchToPhone={() => setMode('phone')} />
  }

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'contents', ...themeVars }}
    >
      {/* Wrapper qui applique le thème au téléphone */}
      <div style={{
        display: 'contents',
        '--accent':       phoneTheme?.color ?? '#b96eff',
        '--grad':         phoneTheme ? `linear-gradient(135deg, ${phoneTheme.color}, #7b9fff)` : 'linear-gradient(135deg, #b96eff, #7b9fff)',
        '--phone-bg':     phoneTheme?.bg ?? '#080808',
        '--phone-radius': phoneTheme ? `${phoneTheme.border_radius}px` : '48px',
        '--phone-glow':   phoneTheme ? `${phoneTheme.color}22` : 'rgba(185,110,255,0.07)',
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
