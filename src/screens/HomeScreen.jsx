import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import { useAuth } from '../context/AuthContext'

const ALL_APPS = [
  { id: 'messages',  label: 'Messages',       icon: '💬', bg: '#1a1a2e' },
  { id: 'phone',     label: 'Téléphone',      icon: '📞', bg: '#0d2818' },
  { id: 'instagrim', label: 'Instagrim',      icon: '📷', bg: '#1a0d2e' },
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: '#1a1a1a' },
  { id: 'camera',    label: 'Appareil photo', icon: '🤳', bg: '#1a1a1a' },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: '#1a1a1a' },
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

      <div className="home-time">
        <Clock big />
        <p className="date">{dateStr} · {location}</p>
      </div>

      <div className="app-grid">
        {ALL_APPS.map((app, i) => {
          const unlocked = unlockedApps.includes(app.id)
          return (
            <div
              key={app.id}
              className={`app-icon-wrap ${!unlocked ? 'locked' : ''}`}
              onClick={() => unlocked && onOpenApp(app.id)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="app-icon-box" style={{ background: app.bg }}>
                <span>{unlocked ? app.icon : '🔒'}</span>
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
  )
}
