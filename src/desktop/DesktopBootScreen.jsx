import { useEffect, useState } from 'react'

const CHECKS = [
  'Initialisation du noyau…',
  'Chargement des pilotes graphiques…',
  'Connexion aux services Phoenix…',
  'Synchronisation du profil…',
  'Prêt.',
]

export default function DesktopBootScreen({ onFinish }) {
  const [visibleChecks, setVisibleChecks] = useState(0)
  const DURATION = 2100

  useEffect(() => {
    const stepDelay = DURATION / (CHECKS.length + 1)
    const timers = CHECKS.map((_, i) =>
      setTimeout(() => setVisibleChecks(i + 1), stepDelay * (i + 1))
    )
    const done = setTimeout(onFinish, DURATION + 250)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #080810 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      {/* Halo de fond */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(185,110,255,0.12) 0%, transparent 70%)',
        animation: 'bootPulse 2.5s ease-in-out infinite',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <img
          src="/phoenix-os-logo.png"
          alt="Phoenix OS"
          style={{
            width: 120, height: 'auto', marginBottom: 6,
            filter: 'drop-shadow(0 0 24px rgba(185,110,255,0.4))',
            animation: 'bootLogoIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
          }}
        />
      </div>

      {/* Barre de progression */}
      <div style={{ width: 220, position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, #b96eff, #7b9fff)',
            animation: `bootBar ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
          }} />
        </div>
      </div>

      {/* Lignes de statut */}
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', zIndex: 1 }}>
        {CHECKS.map((line, i) => (
          <p key={i} style={{
            fontSize: 11, fontFamily: "'Courier New', monospace",
            color: i === CHECKS.length - 1 ? '#4ade80' : 'rgba(255,255,255,0.4)',
            opacity: i < visibleChecks ? 1 : 0,
            transform: i < visibleChecks ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
            {i < visibleChecks && (i === CHECKS.length - 1 ? '✓ ' : '› ')}{line}
          </p>
        ))}
      </div>

      <style>{`
        @keyframes bootBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes bootPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1; transform: translate(-50%,-50%) scale(1.1); }
        }
        @keyframes bootLogoIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
