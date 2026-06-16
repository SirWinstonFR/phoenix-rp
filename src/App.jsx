import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'

const SCREENS = {
  home: HomeScreen,
  instagrim: InstaGrimScreen,
}

export default function App() {
  const { user, loading } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')

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
    <Screen
      onOpenApp={appId => {
        if (SCREENS[appId]) setCurrentScreen(appId)
        else alert('Cette app arrive bientôt !')
      }}
      onBack={() => setCurrentScreen('home')}
    />
  )
}
