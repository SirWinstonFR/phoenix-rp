import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

const ALL_APPS = [
  { id: 'messages',  label: 'Messages',       icon: '💬', bg: 'linear-gradient(135deg,#1a1a3e,#0d1a2e)', badge: 2 },
  { id: 'phone',     label: 'Téléphone',      icon: '📞', bg: 'linear-gradient(135deg,#0d2818,#0a1f12)' },
  { id: 'instagrim', label: 'Capture',        icon: null, img: '/capture.png', bg: 'transparent', badge: 1 },
  { id: 'map',       label: 'Carte',          icon: '🗺️', bg: 'linear-gradient(135deg,#0a1f2e,#0d2a1a)' },
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'camera',    label: 'Appareil photo', icon: '🤳', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
]

export default function HomeScreen({ onOpenApp }) {
  const { profile, signOut } = useAuth()
  const unlockedApps = profile?.unlocked_apps ?? ['messages', 'phone', 'instagrim', 'map']
  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const location = profile?.location || 'Île de Valoria'

  return (
    <div className="phone">
      <StatusBar />
      <div className="home-wrap">

        <div className="home-time">
          <Clock big />
          <p className="home-date">{dateStr} · {location}</p>
        </div>

        {/* Profil + déconnexion */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 10, margin: '0 14px 4px',
          padding: '8px 12px',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
        }}>
          <Avatar profile={profile} size={32} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2 }}>
              {profile?.username ?? 'Joueur'}
            </p>
            {profile?.location && (
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>📍 {profile.location}</p>
            )}
          </div>
          <button
            onClick={signOut}
            style={{
              background: 'rgba(255,82,82,0.1)',
              border: '1px solid rgba(255,82,82,0.2)',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#ff5252',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,82,82,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,82,82,0.1)'}
          >
            🔒 Verrouiller
          </button>
        </div>

        <div className="app-grid">
          {ALL_APPS.map((app, i) => {
            const unlocked = unlockedApps.includes(app.id)
            return (
              <div
                key={app.id}
                className={`app-icon-wrap ${!unlocked ? 'locked' : ''}`}
                onClick={() => unlocked && onOpenApp(app.id)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {unlocked && app.img ? (
                  <div style={{ position: 'relative', width: 58, height: 58 }}>
                    <img
                      src={app.img}
                      alt={app.label}
                      style={{ width: 58, height: 58, borderRadius: 18, display: 'block', objectFit: 'cover' }}
                    />
                    {app.badge && (
                      <span className="app-badge">{app.badge}</span>
                    )}
                  </div>
                ) : (
                  <div className="app-icon-box" style={{ background: app.bg }}>
                    <span>{unlocked ? app.icon : '🔒'}</span>
                    {app.badge && unlocked && (
                      <span className="app-badge">{app.badge}</span>
                    )}
                  </div>
                )}
                <span className="app-label">{unlocked ? app.label : 'Verrouillée'}</span>
              </div>
            )
          })}
        </div>

        <div className="home-bar">
          <div className="home-indicator" />
        </div>
      </div>
    </div>
  )
}
