import Clock from '../components/Clock'
import StatusBar from '../components/StatusBar'
import { useAuth } from '../context/AuthContext'

const ALL_APPS = [
  { id: 'messages',  label: 'Messages',       icon: '💬', bg: '#e6f1fb' },
  { id: 'phone',     label: 'Téléphone',      icon: '📞', bg: '#eaf3de' },
  { id: 'instagrim', label: 'Instagrim',      icon: '📷', bg: '#fff4e6' },
  { id: 'notes',     label: 'Notes',          icon: '📝', bg: '#fff'    },
  { id: 'camera',    label: 'Appareil photo', icon: '🤳', bg: '#fff'    },
  { id: 'settings',  label: 'Réglages',       icon: '⚙️', bg: '#fff'    },
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
        {ALL_APPS.map(app => {
          const unlocked = unlockedApps.includes(app.id)
          return (
            <div
              key={app.id}
              className={`app-icon-wrap ${!unlocked ? 'locked' : ''}`}
              onClick={() => unlocked && onOpenApp(app.id)}
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
