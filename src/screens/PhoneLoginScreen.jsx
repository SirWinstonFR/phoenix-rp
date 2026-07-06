import { useState } from 'react'
import { supabase } from '../supabase'
import StatusBar from '../components/StatusBar'
import Clock from '../components/Clock'

export default function PhoneLoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  async function loginWithDiscord() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // Si pas d'erreur, Discord redirige automatiquement
  }

  return (
    <div className="phone">
      <StatusBar />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 0 40px'
      }}>

        {/* Heure + date */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Clock big />
          <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>{today}</p>
        </div>

        {/* Zone de connexion */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
          width: '100%', padding: '0 28px'
        }}>

          <div style={{
            fontSize: 13, color: 'var(--t2)', textAlign: 'center',
            background: 'var(--glass)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '12px 20px', width: '100%'
          }}>
            🔒 Téléphone verrouillé
          </div>

          {error && <p className="form-error" style={{ width: '100%' }}>{error}</p>}

          {/* Bouton Discord */}
          <button
            onClick={loginWithDiscord}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12,
              background: '#5865F2',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(88,101,242,0.4)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
          >
            {/* Logo Discord SVG */}
            <svg width="22" height="22" viewBox="0 0 71 55" fill="none">
              <path d="M60.1 4.9A58.6 58.6 0 0 0 45.5.4a40.6 40.6 0 0 0-1.8 3.7 54.2 54.2 0 0 0-16.3 0A40.6 40.6 0 0 0 25.6.4 58.4 58.4 0 0 0 11 4.9C1.6 19 -1 32.7.3 46.2a59 59 0 0 0 18 9.1 44.7 44.7 0 0 0 3.9-6.3 38.4 38.4 0 0 1-6.1-2.9l1.5-1.1a42 42 0 0 0 35.9 0l1.5 1.1a38.3 38.3 0 0 1-6.1 2.9 44.5 44.5 0 0 0 3.9 6.3 58.8 58.8 0 0 0 18-9.1C72 30.6 68.3 17 60.1 4.9ZM23.7 37.9c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Z" fill="currentColor"/>
            </svg>
            {loading ? 'Redirection…' : 'Se connecter avec Discord'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.5 }}>
            Ton compte Discord devient ton téléphone RP.{'\n'}
            Aucun mot de passe supplémentaire.
          </p>

        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
        <div className="home-indicator" />
      </div>
    </div>
  )
}
