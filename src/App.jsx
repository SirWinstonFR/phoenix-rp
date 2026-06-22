import { useState, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import PhoneLoginScreen from './screens/PhoneLoginScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
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
    // Swipe up = retour accueil (sauf si déjà sur l'accueil)
    if (deltaY > 70 && currentScreen !== 'home') {
      setCurrentScreen('home')
    }
    touchStartY.current = null
  }

  // Chargement initial
  if (loading) {
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 12 }}>Chargement…</p>
      </div>
    )
  }

  // Pas de compte → écran de login du TÉLÉPHONE (pas d'Instagrim)
  if (!user) {
    return <PhoneLoginScreen />
  }

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
