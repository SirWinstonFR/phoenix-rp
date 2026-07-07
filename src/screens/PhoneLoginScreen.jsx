import { useState } from 'react'
import { supabase } from '../supabase'
import Clock from '../components/Clock'

export default function PhoneLoginScreen({ onModeSelect }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [step, setStep]       = useState('choose') // 'choose' | 'phone' | 'desktop'

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  async function loginWithDiscord(mode) {
    setLoading(true)
    setError('')
    // Stocker le mode choisi pour après la redirection
    localStorage.setItem('rp_mode', mode)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  // Écran de choix du mode
  if (step === 'choose') {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: 'radial-gradient(ellipse at 30% 30%, rgba(185,110,255,0.1) 0%, transparent 60%), #080810',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 48, fontFamily: 'Inter, sans-serif',
      }}>

        {/* Logo + titre */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 36, fontWeight: 800, letterSpacing: -1.5,
            background: 'linear-gradient(135deg, #b96eff, #7b9fff, #4dd9ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            Phoenix RP
          </p>
          <p style={{ fontSize: 14, color: '#555' }}>Choisissez votre interface</p>
        </div>

        {/* Cartes de choix */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>

          {/* Mode Téléphone */}
          <div
            onClick={() => !loading && loginWithDiscord('phone')}
            style={{
              width: 200, padding: '32px 24px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 16,
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(185,110,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(185,110,255,0.4)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Miniature téléphone */}
            <div style={{
              width: 72, height: 120,
              background: '#111',
              borderRadius: 16,
              border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              <div style={{ height: 8, background: '#000', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: 24, height: 4, background: '#222', borderRadius: 2 }} />
              </div>
              <div style={{ flex: 1, background: 'linear-gradient(135deg,#0a0a12,#0d0d1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 200, color: '#b96eff' }}>12:00</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginTop: 4 }}>
                  {['💬','📞','📷','🗺️','📝','⚙️'].map((icon, i) => (
                    <div key={i} style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7 }}>{icon}</div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📱 Téléphone</p>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>Interface mobile simulée</p>
            </div>
          </div>

          {/* Mode Desktop */}
          <div
            onClick={() => !loading && loginWithDiscord('desktop')}
            style={{
              width: 200, padding: '32px 24px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 16,
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(123,159,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(123,159,255,0.4)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Miniature desktop */}
            <div style={{
              width: 120, height: 80,
              background: '#0a0a12',
              borderRadius: 8,
              border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              <div style={{ flex: 1, position: 'relative', padding: 6 }}>
                {/* Icônes bureau */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 'fit-content' }}>
                  {['💬','📷','🗺️'].map((icon, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 3, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                    </div>
                  ))}
                </div>
                {/* Fenêtre */}
                <div style={{
                  position: 'absolute', top: 10, left: 24, right: 4, bottom: 4,
                  background: 'rgba(20,20,30,0.9)', borderRadius: 4,
                  border: '1px solid rgba(185,110,255,0.3)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ height: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }} />
                  </div>
                </div>
              </div>
              {/* Taskbar */}
              <div style={{ height: 12, background: 'rgba(8,8,16,0.9)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg,#b96eff,#7b9fff)' }} />
                <div style={{ width: 20, height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🖥️ Desktop</p>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>Interface Windows-like</p>
            </div>
          </div>

        </div>

        {loading && (
          <p style={{ fontSize: 13, color: '#555' }}>Redirection Discord…</p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 16px', borderRadius: 10 }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: '#333', position: 'absolute', bottom: 20 }}>
          Phoenix RP · Connexion via Discord
        </p>
      </div>
    )
  }
}
