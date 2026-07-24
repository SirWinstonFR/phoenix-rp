import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

export default function CharacterSelector() {
  const { characters, selectCharacter, signOut } = useAuth()

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(185,110,255,0.08) 0%, transparent 60%), #050508',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, fontFamily: 'Inter, sans-serif', padding: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
          background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 6,
        }}>
          Choisis ton personnage
        </p>
        <p style={{ fontSize: 13, color: '#666' }}>
          Ton compte Discord a {characters.length} personnage{characters.length > 1 ? 's' : ''} sur Phoenix RP
        </p>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 14,
        justifyContent: 'center', maxWidth: 500,
      }}>
        {characters.map(char => (
          <div
            key={char.id}
            onClick={() => selectCharacter(char.id)}
            style={{
              width: 150, padding: '24px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(185,110,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(185,110,255,0.35)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Avatar profile={char} size={64} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{char.username}</p>
              {char.location && (
                <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>📍 {char.location}</p>
              )}
              {!char.setup_complete && (
                <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                  À compléter
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        style={{
          background: 'none', border: 'none', color: '#555',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Se déconnecter
      </button>
    </div>
  )
}
