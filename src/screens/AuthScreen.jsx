import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!username.trim()) { setError('Choisis un pseudo.'); setLoading(false); return }
        await signUp(email, password, username.trim())
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="form-screen">

        <div>
          <p className="form-logo">instagrim</p>
          <p className="form-subtitle">
            {mode === 'login' ? 'Retrouve ton personnage.' : 'Rejoins le monde RP.'}
          </p>
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label>Pseudo RP</label>
            <input
              placeholder="ex: jane.doe_rp"
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
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>

        <div className="divider">ou</div>

        <button className="btn-ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Pas encore de compte ? Créer un profil' : 'Déjà un compte ? Se connecter'}
        </button>

      </div>
    </div>
  )
}
