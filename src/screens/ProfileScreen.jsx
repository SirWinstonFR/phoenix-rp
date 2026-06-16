import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function ProfileScreen({ onBack }) {
  const { profile, updateProfile, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      await updateProfile({ bio, location })
      setEditing(false)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">{profile?.username ?? 'Profil'}</span>
          <button className="icon-btn" onClick={() => setEditing(!editing)}>
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="profile-header">
            <div className="profile-avatar" style={{ background: profile?.avatar_color ?? '#888' }}>
              {profile?.initials ?? '?'}
            </div>
            <p className="profile-name">{profile?.username}</p>
            {profile?.location && (
              <p style={{ fontSize: 12, color: '#aaa' }}>📍 {profile.location}</p>
            )}
            <p className="profile-bio">{profile?.bio || "Aucune bio pour l'instant."}</p>
          </div>

          {editing ? (
            <div className="form-screen" style={{ paddingTop: 16 }}>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Décris ton personnage..."
                />
              </div>
              <div className="form-group">
                <label>Lieu RP</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="ex: Île de Valoria"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-outline" onClick={signOut}>Se déconnecter</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
