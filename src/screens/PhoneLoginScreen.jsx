import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Clock from '../components/Clock'

export default function PhoneLoginScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]         = useState('lock')      // 'lock' | 'login' | 'register'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!username.trim()) { setError('Choisis un pseudo.'); setLoading(false); return }
        if (password.length < 6) { setError('Mot de passe trop court (6 caractères min).'); setLoading(false); return }
        await signUp(email, password, username.trim())
      }
      // La session est automatiquement persistée par Supabase
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── Écran verrouillé ──
  if (mode === 'lock') {
    return (
      <div className="phone">
        <StatusBar />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 40px'
        }}>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Clock big />
            <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>{today}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', padding: '0 28px' }}>
            <div style={{
              fontSize: 13, color: 'var(--t2)', textAlign: 'center',
              background: 'var(--glass)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '12px 20px',
            }}>
              🔒 Téléphone verrouillé
            </div>

            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setMode('login')}>
              Se connecter
            </button>

            <button className="btn-ghost" onClick={() => setMode('register')}>
              Créer un nouveau compte
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <div className="home-indicator" />
        </div>
      </div>
    )
  }

  // ── Formulaire login / register ──
  return (
    <div className="phone">
      <StatusBar />
      <div className="form-screen">

        <button
          className="icon-btn"
          onClick={() => { setMode('lock'); setError('') }}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Retour
        </button>

        <div>
          <p className="form-logo" style={{ fontSize: 24 }}>
            {mode === 'login' ? '🔓 Connexion' : '📱 Nouveau téléphone'}
          </p>
          <p className="form-tagline">
            {mode === 'login'
              ? 'Retrouve ton personnage et tes applis.'
              : 'Crée ton compte pour accéder à ton téléphone RP.'
            }
          </p>
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label>Ton pseudo RP</label>
            <input
              placeholder="ex: jane_valoria"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading
            ? 'Chargement…'
            : mode === 'login' ? 'Déverrouiller' : 'Créer mon téléphone'
          }
        </button>

        <div className="divider">ou</div>

        <button className="btn-ghost" onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login')
          setError('')
        }}>
          {mode === 'login'
            ? 'Pas encore de compte ? Créer un profil'
            : 'Déjà un compte ? Se connecter'
          }
        </button>

      </div>
    </div>
  )
}
