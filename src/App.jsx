import { useState, useRef, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import PhoneLoginScreen from './screens/PhoneLoginScreen'
import HomeScreen from './screens/HomeScreen'
import InstaGrimScreen from './screens/InstaGrimScreen'
import MapScreen from './screens/MapScreen'
import DesktopMode from './desktop/DesktopMode'
import CharacterSelector from './screens/CharacterSelector'
import CharacterReservationScreen from './screens/CharacterReservationScreen'

import CrushScreen from './screens/CrushScreen'
import IDScreen from './screens/IDScreen'
import StoreScreen from './screens/StoreScreen'
import BankScreen from './screens/BankScreen'
import DarkWebScreen from './screens/DarkWebScreen'
import ProfileCardScreen from './screens/ProfileCardScreen'
import MJDashboardScreen from './screens/MJDashboardScreen'
import WikiPanel from './components/WikiPanel'
import { getAppMeta } from './constants/apps'
import DeviceStatusBar from './components/DeviceStatusBar'

const SCREENS = {
  home:      HomeScreen,
  instagrim: InstaGrimScreen,
  map:       MapScreen,
  crush:     CrushScreen,
  id:        IDScreen,
  store:     StoreScreen,
  bank:      BankScreen,
  darkweb:   DarkWebScreen,
  card:      ProfileCardScreen,
  mjpanel:   MJDashboardScreen,
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
  const { user, loading, profile, activeId, characters = [], refreshCharacters, switchCharacter, signOut } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('home')
  const [appOrigin, setAppOrigin] = useState(null) // position de l'icône tapée, pour l'effet "grandit depuis l'icône"
  const [wikiOpen, setWikiOpen] = useState(false)
  const [loadingAppId, setLoadingAppId] = useState(null) // appli en cours de "chargement" fictif
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

  function onZoneDown(e) {
    if (currentScreen === 'home') return
    touchStartY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onZoneMove(e) {
    if (touchStartY.current === null) return
    e.preventDefault()
    const delta = touchStartY.current - e.clientY
    if (delta > 0) setDragY(delta)
  }

  function onZoneUp() {
    if (touchStartY.current === null) return
    touchStartY.current = null

    if (dragY > DRAG_THRESHOLD) {
      // Terminer l'animation de sortie puis basculer sur l'accueil
      setDragging(false)
      setDragY(DRAG_MAX + 40)
      setTimeout(() => {
        setCurrentScreen('home')
        setAppOrigin(null)
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

  // Premier personnage jamais créé → formulaire de réservation obligatoire
  if (characters.length === 0) {
    return <CharacterReservationScreen onDone={refreshCharacters} />
  }

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
    <>
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      transform: `translateX(${wikiOpen ? -90 : 0}px)`,
      transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <DeviceStatusBar
        profile={profile}
        characters={characters}
        switchCharacter={switchCharacter}
        onOpenWiki={() => setWikiOpen(true)}
        onSwitchToDesktop={() => setMode('desktop')}
        signOut={signOut}
      />
      <div style={{
        position: 'relative',
        transform: `translateY(${liveTranslateY}px) scale(${liveScale})`,
        opacity: liveOpacity,
        transformOrigin: 'center bottom',
        transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease',
        userSelect: dragging ? 'none' : 'auto',
        WebkitUserSelect: dragging ? 'none' : 'auto',
        '--accent':        phoneTheme?.color ?? '#b96eff',
        '--grad':          phoneTheme ? `linear-gradient(135deg, ${phoneTheme.color}, #7b9fff)` : 'linear-gradient(135deg, #b96eff, #7b9fff)',
        '--phone-bg':      phoneTheme?.bg ?? '#080808',
        '--phone-radius':  phoneTheme ? `${phoneTheme.border_radius}px` : '48px',
        '--phone-glow':    phoneTheme ? `${phoneTheme.color}22` : 'rgba(185,110,255,0.07)',
        '--phone-shell':   phoneTheme?.shell ?? '#0c0c0c',
        '--phone-shell-2': phoneTheme?.shell ? phoneTheme.shell + '88' : 'rgba(255,255,255,0.05)',
        '--phone-border':  phoneTheme ? `${phoneTheme.color}33` : 'rgba(255,255,255,0.1)',
        '--app-origin':    appOrigin ? `${appOrigin.x}px ${appOrigin.y}px` : '50% 100%',
        ...frameVars,
      }}>
      {/* Aperçu de l'accueil qui se révèle en dessous pendant le geste de sortie */}
      {dragY > 0 && currentScreen !== 'home' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          borderRadius: 'var(--phone-radius, 48px)', overflow: 'hidden',
          transform: `scale(${0.92 + dragProgress * 0.08})`,
          opacity: 0.5 + dragProgress * 0.5,
          transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease',
          pointerEvents: 'none',
        }}>
          <HomeScreen onOpenApp={() => {}} phoneTheme={phoneTheme} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 2 }}>
        {loadingAppId ? (
          <AppLoadingSplash appId={loadingAppId} onFinish={() => {
            setCurrentScreen(loadingAppId)
            setLoadingAppId(null)
          }} />
        ) : (
          <Screen
            onOpenApp={(appId, origin) => {
              if (SCREENS[appId]) {
                setAppOrigin(origin ?? null)
                setLoadingAppId(appId)
              } else {
                alert('Cette app arrive bientôt !')
              }
            }}
            onBack={() => { setAppOrigin(null); setCurrentScreen('home') }}
            onSwitchToDesktop={() => setMode('desktop')}
            onOpenWiki={() => setWikiOpen(true)}
            phoneTheme={phoneTheme}
          />
        )}
      </div>

      {/* Zone de geste — tout en bas de l'écran, comme la barre d'accueil iOS */}
      {currentScreen !== 'home' && (
        <div
          onPointerDown={onZoneDown}
          onPointerMove={onZoneMove}
          onPointerUp={onZoneUp}
          onPointerCancel={onZoneUp}
          style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: 140, height: 22, zIndex: 999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 7, cursor: 'grab', touchAction: 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
        >
          <div style={{
            width: 100, height: 4, borderRadius: 3,
            background: dragging ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)',
            transition: dragging ? 'none' : 'background 0.2s',
            pointerEvents: 'none',
          }} />
        </div>
      )}
      </div>
    </div>

    {wikiOpen && <WikiPanel onClose={() => setWikiOpen(false)} />}
    </>
  )
}

// Écran de "chargement" fictif — logo de l'appli + barre de progression animée
function AppLoadingSplash({ appId, onFinish }) {
  const meta = getAppMeta(appId)
  const DURATION = 750 // ms — synchronisé avec l'animation CSS de la barre

  useEffect(() => {
    const t = setTimeout(onFinish, DURATION)
    return () => clearTimeout(t)
  }, [appId])

  return (
    <div className="phone">
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 22,
        background: meta?.bg ?? 'linear-gradient(135deg,#1a1a1a,#222)',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 24,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 42, boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          animation: 'splashPulse 1.1s ease-in-out infinite',
          overflow: 'hidden',
        }}>
          {meta?.img
            ? <img src={meta.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : meta?.icon ?? '📱'
          }
        </div>

        <p style={{
          fontSize: 15, fontWeight: 700, color: '#fff',
          fontFamily: 'Inter, sans-serif', letterSpacing: -0.2,
        }}>
          {meta?.label ?? 'Chargement'}
        </p>

        <div style={{
          width: 140, height: 4, borderRadius: 3,
          background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.5), #fff)',
            animation: `splashBar ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
          }} />
        </div>
      </div>

      <style>{`
        @keyframes splashBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
