import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

const ORANGE = '#e8752c'
const ORANGE_LIGHT = '#f5a052'

export default function CharacterSelector() {
  const { characters, selectCharacter, signOut } = useAuth()

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: `
        radial-gradient(ellipse 700px 480px at 50% 0%, rgba(232,117,44,0.09) 0%, transparent 65%),
        #060504
      `,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 40, fontFamily: 'Inter, sans-serif', padding: 24,
      overflow: 'hidden', position: 'relative',
    }}>

      {/* En-tête */}
      <div style={{ textAlign: 'center', animation: 'charFadeDown 0.5s ease both' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em',
          color: 'rgba(245,160,82,0.85)', textTransform: 'uppercase',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '6px 16px', borderRadius: 20,
          marginBottom: 20,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ORANGE, boxShadow: `0 0 8px ${ORANGE}`,
          }} />
          BRIDGE TO PHOENIX · {characters.length} PERSONNAGE{characters.length > 1 ? 'S' : ''}
        </div>
        <p style={{
          fontSize: 28, fontWeight: 800, letterSpacing: -0.6,
          color: '#f5f2ee',
        }}>
          Tes personnages
        </p>
      </div>

      {/* Grille de personnages */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 18,
        justifyContent: 'center', maxWidth: 640,
      }}>
        {characters.map((char, i) => (
          <div
            key={char.id}
            onClick={() => selectCharacter(char.id)}
            className="char-card"
            style={{
              width: 168, padding: '30px 18px 22px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              position: 'relative',
              animation: `charCardIn 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.08}s both`,
            }}
          >
            {/* Avatar — un seul anneau, propre */}
            <Avatar
              profile={char}
              size={76}
              style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})` }}
            />

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f2ee', marginBottom: 3 }}>
                {char.username}
              </p>
              {char.location ? (
                <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.4)' }}>📍 {char.location}</p>
              ) : (
                <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.25)' }}>Phoenix, AZ</p>
              )}

              {char.bio && (
                <p style={{
                  fontSize: 10.5, color: 'rgba(245,242,238,0.35)', marginTop: 6,
                  lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {char.bio}
                </p>
              )}
            </div>

            {!char.setup_complete && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                color: ORANGE_LIGHT, background: 'rgba(232,117,44,0.1)',
                border: `1px solid rgba(232,117,44,0.25)`,
                padding: '3px 9px', borderRadius: 8,
              }}>
                À COMPLÉTER
              </span>
            )}

            <div className="char-card-enter" style={{
              fontSize: 11, fontWeight: 700, color: ORANGE_LIGHT,
              opacity: 0, transform: 'translateY(4px)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}>
              Entrer →
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        style={{
          background: 'none', border: 'none', color: 'rgba(245,242,238,0.25)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'color 0.2s',
          animation: 'charFadeDown 0.5s ease 0.3s both',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,242,238,0.5)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,242,238,0.25)'}
      >
        Se déconnecter
      </button>

      <style>{`
        @keyframes charFadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes charCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .char-card {
          transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s, background 0.25s;
        }
        .char-card:hover {
          transform: translateY(-6px);
          border-color: rgba(232,117,44,0.4);
          background: rgba(255,255,255,0.035);
        }
        .char-card:hover .char-card-enter {
          opacity: 1;
          transform: translateY(0);
        }
        .char-card:active {
          transform: translateY(-2px) scale(0.98);
        }
      `}</style>
    </div>
  )
}
