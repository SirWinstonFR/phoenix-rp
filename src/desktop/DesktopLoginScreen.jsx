import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'

export default function DesktopLoginScreen({ profile, onFinish }) {
  const [dots, setDots] = useState(0)
  const MAX_DOTS = 9

  useEffect(() => {
    // Simule la saisie du mot de passe, point par point
    const typing = setInterval(() => {
      setDots(d => {
        if (d >= MAX_DOTS) {
          clearInterval(typing)
          return d
        }
        return d + 1
      })
    }, 90)
    return () => clearInterval(typing)
  }, [])

  useEffect(() => {
    if (dots < MAX_DOTS) return
    const t = setTimeout(onFinish, 500)
    return () => clearTimeout(t)
  }, [dots])

  const now = new Date()
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #080810 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 26, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      {/* Halo de fond */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(185,110,255,0.1) 0%, transparent 70%)',
      }} />

      {/* Heure, façon écran de verrouillage Windows */}
      <div style={{
        position: 'absolute', top: 34, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', animation: 'loginFadeDown 0.5s ease both',
      }}>
        <p style={{ fontSize: 40, fontWeight: 300, color: '#fff', letterSpacing: -1 }}>{time}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{date}</p>
      </div>

      {/* Avatar + nom */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, animation: 'loginPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 14px',
          padding: 3, background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
          boxShadow: '0 0 30px rgba(185,110,255,0.35)',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '3px solid #0a0a12' }}>
            <Avatar profile={profile} size={82} />
          </div>
        </div>
        <p style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>
          {profile?.username ?? 'Utilisateur'}
        </p>
      </div>

      {/* Mot de passe factice qui se "tape" tout seul */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24, padding: '10px 8px 10px 18px', minWidth: 200,
        position: 'relative', zIndex: 1,
        animation: 'loginPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both',
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>🔒</span>
        <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', height: 14 }}>
          {Array.from({ length: MAX_DOTS }).map((_, i) => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < dots ? '#fff' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.15s',
            }} />
          ))}
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: dots >= MAX_DOTS ? 'linear-gradient(135deg, #b96eff, #7b9fff)' : 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, transition: 'background 0.3s',
        }}>→</div>
      </div>

      <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.25)', position: 'relative', zIndex: 1,
        animation: 'loginPop 0.5s ease 0.4s both',
      }}>
        Connexion en cours…
      </p>

      <style>{`
        @keyframes loginFadeDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes loginPop {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
