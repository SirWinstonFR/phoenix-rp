// Composant Avatar réutilisable
// Affiche la photo de profil si disponible, sinon les initiales colorées

export default function Avatar({ profile, size = 36, style = {} }) {
  const borderWidth = size > 50 ? 3 : 2
  const fontSize = size > 50 ? Math.floor(size * 0.35) : Math.floor(size * 0.38)

  const inner = (
    <div style={{
      width: '100%', height: '100%',
      borderRadius: '50%',
      background: profile?.avatar_color ?? '#333',
      border: `${borderWidth}px solid var(--bg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: '#fff',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {profile?.avatar_url
        ? <img
            src={profile.avatar_url}
            alt={profile.username}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        : (profile?.initials ?? '?')
      }
    </div>
  )

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      padding: 2.5,
      background: 'linear-gradient(135deg, #ff6eb4, #b96eff, #7b9fff)',
      flexShrink: 0,
      ...style,
    }}>
      {inner}
    </div>
  )
}
