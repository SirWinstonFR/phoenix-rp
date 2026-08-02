import { useEffect } from 'react'

export default function DesktopLoadingScreen({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 850)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #080810 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 18, fontFamily: 'Inter, sans-serif',
    }}>
      <img
        src="/chargement-desktop.gif"
        alt="Chargement"
        style={{ width: 64, height: 64, objectFit: 'contain' }}
      />
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
        Ouverture de la session…
      </p>
    </div>
  )
}
