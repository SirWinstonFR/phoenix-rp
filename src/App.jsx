import { useState, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
}

export default function App() {
  const { user, loading } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')

  // ── Détection du swipe up ──
  const touchStartY = useRef(null)

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    // Swipe vers le haut d'au moins 60px → retour accueil
    if (deltaY > 60 && currentScreen !== 'home') {
      setCurrentScreen('home')
    }
    touchStartY.current = null
  }

  if (loading) {
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'contents' }}
    >
      <Screen
        onOpenApp={appId => {
          if (SCREENS[appId]) setCurrentScreen(appId)
          else alert('Cette app arrive bientôt !')
        }}
        onBack={() => setCurrentScreen('home')}
      />
    </div>
  )
}
