import { useState, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import PhoneLoginScreen from './screens/PhoneLoginScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'
import MapScreen from './screens/MapScreen'
import DesktopMode from './desktop/DesktopMode'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  map:       MapScreen,
}

export default function App() {
  const { user, loading } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const [mode, setMode] = useState('phone')
  const touchStartY = useRef(null)

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
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 12 }}>Chargement…</p>
      </div>
    )
  }

  if (!user) return <PhoneLoginScreen />

  if (mode === 'desktop') {
    return <DesktopMode onSwitchToPhone={() => setMode('phone')} />
  }

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ display: 'contents' }}>
      <Screen
        onOpenApp={appId => {
          if (SCREENS[appId]) setCurrentScreen(appId)
          else alert('Cette app arrive bientôt !')
        }}
        onBack={() => setCurrentScreen('home')}
        onSwitchToDesktop={() => setMode('desktop')}
      />
    </div>
  )
}
