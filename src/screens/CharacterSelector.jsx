import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

export default function CharacterSelector() {
  const { characters, selectCharacter, signOut } = useAuth()

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: `
        radial-gradient(ellipse 700px 500px at 20% 15%, rgba(185,110,255,0.10) 0%, transparent 60%),
        radial-gradient(ellipse 600px 450px at 85% 80%, rgba(123,159,255,0.08) 0%, transparent 60%),
        #050508
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
          fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
          color: 'rgba(185,110,255,0.7)', textTransform: 'uppercase',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '6px 16px', borderRadius: 20,
          marginBottom: 18,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#c9963f', boxShadow: '0 0 8px #c9963f',
          }} />
          PHOENIX RP · {characters.length} PERSONNAGE{characters.length > 1 ? 'S' : ''}
        </div>
        <p style={{
          fontSize: 30, fontWeight: 800, letterSpacing: -0.8,
          background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Qui incarnes-tu ?
        </p>
      </div>

      {/* Grille de personnages */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 18,
        justifyContent: 'center', maxWidth: 640,
      }}>
        {characters.map((char, i) => {
          const accent = char.phone_theme?.color ?? '#b96eff'
          return (
            <div
              key={char.id}
              onClick={() => selectCharacter(char.id)}
              className="char-card"
              style={{
                '--char-accent': accent,
                width: 168, padding: '28px 18px 20px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 22, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                position: 'relative', overflow: 'hidden',
                animation: `charCardIn 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.08}s both`,
              }}
            >
              {/* Glow de fond coloré */}
              <div style={{
                position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
                width: 140, height: 140, borderRadius: '50%',
                background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Avatar avec anneau coloré */}
              <div style={{
                width: 78, height: 78, borderRadius: '50%', padding: 3,
                background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                boxShadow: `0 0 24px ${accent}44`,
                position: 'relative', zIndex: 1,
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  border: '3px solid #050508', overflow: 'hidden',
                }}>
                  <Avatar profile={char} size={70} style={{ border: 'none', padding: 0 }} />
                </div>
              </div>

              <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                  {char.username}
                </p>
                {char.location ? (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>📍 {char.location}</p>
                ) : (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Phoenix, AZ</p>
                )}

                {char.bio && (
                  <p style={{
                    fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 6,
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
                  color: '#f59e0b', background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  padding: '3px 9px', borderRadius: 8,
                  position: 'relative', zIndex: 1,
                }}>
                  À COMPLÉTER
                </span>
              )}

              {/* Indicateur "entrer" au survol */}
              <div className="char-card-enter" style={{
                fontSize: 11, fontWeight: 700, color: accent,
                opacity: 0, transform: 'translateY(4px)',
                transition: 'opacity 0.2s, transform 0.2s',
                position: 'relative', zIndex: 1,
              }}>
                Entrer →
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={signOut}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'color 0.2s',
          animation: 'charFadeDown 0.5s ease 0.3s both',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
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
          border-color: var(--char-accent);
          background: rgba(255,255,255,0.04);
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
