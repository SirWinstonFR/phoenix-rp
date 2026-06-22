import { useState, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'
import AuthScreen from './screens/AuthScreen'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  login:     AuthScreen,
}

export default function App() {
  const { user, loading } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const touchStartY = useRef(null)

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
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

  // Si on essaie d'ouvrir Instagrim sans être connecté → écran de connexion
  function handleOpenApp(appId) {
    if (appId === 'instagrim' && !user) {
      setCurrentScreen('login')
      return
    }
    if (SCREENS[appId]) setCurrentScreen(appId)
    else alert('Cette app arrive bientôt !')
  }

  const Screen = SCREENS[currentScreen] ?? HomeScreen

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'contents' }}
    >
      <Screen
        onOpenApp={handleOpenApp}
        onBack={() => setCurrentScreen('home')}
        onLoginSuccess={() => setCurrentScreen('instagrim')}
      />
    </div>
  )
}
