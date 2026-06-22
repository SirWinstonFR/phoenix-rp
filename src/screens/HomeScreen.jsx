import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import { useAuth } from '../context/AuthContext'

const ALL_APPS = [
  { id: 'messages',  label: 'Messages',       icon: '💬', bg: 'linear-gradient(135deg,#1a1a3e,#0d1a2e)', badge: 2 },
  { id: 'phone',     label: 'Téléphone',      icon: '📞', bg: 'linear-gradient(135deg,#0d2818,#0a1f12)' },
  { id: 'instagrim', label: 'Instagrim',      icon: '📷', bg: 'linear-gradient(135deg,#2a0d3e,#1a0a28)', badge: 1 },
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'camera',    label: 'Appareil photo', icon: '🤳', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
]

export default function HomeScreen({ onOpenApp }) {
  const { profile } = useAuth()
  const unlockedApps = profile?.unlocked_apps ?? ['messages', 'phone', 'instagrim']
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

        {/* Bannière de notif RP */}
        <div className="notif-banner">
          <span className="notif-icon">🔔</span>
          <span className="notif-text"><b>elara_rp</b> vous a envoyé un message</span>
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
                <div className="app-icon-box" style={{ background: app.bg }}>
                  <span>{unlocked ? app.icon : '🔒'}</span>
                  {app.badge && unlocked && (
                    <span className="app-badge">{app.badge}</span>
                  )}
                </div>
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
